import {
  Alert,
  Badge,
  Box,
  Button,
  chakra,
  ChakraProvider,
  Code,
  Field,
  Flex,
  Grid,
  Heading,
  IconButton,
  Input,
  Link,
  NativeSelect,
  Portal,
  Skeleton,
  Spinner,
  Stack,
  Switch,
  Tabs,
  Text,
  Textarea,
  Tooltip,
  Dialog,
  Menu,
  Popover,
  VisuallyHidden,
} from '@chakra-ui/react';
import type { IconButtonProps } from '@chakra-ui/react';
import { forwardRef, useMemo, useRef, useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { withPreviewColorMode, withPreviewContentSecurityPolicy } from './app';
import type {
  ApplicationState,
  LintFinding,
  LintSeverity,
  PreviewTab,
  Viewport,
} from './app';
import {
  createPreviewSystem,
  previewFeedbackSlotRecipe,
  previewInspectorSlotRecipe,
  previewSlotRecipeKeys,
  previewTemplatesSlotRecipe,
  previewViewerSlotRecipe,
  previewWorkspaceSlotRecipe,
} from './theme';
import { usePreviewSlotRecipe } from './use-slot-recipe';

const tabs: ReadonlyArray<{
  id: PreviewTab;
  label: string;
}> = [
  { id: 'preview', label: 'Preview' },
  { id: 'compare', label: 'Compare' },
  { id: 'html', label: 'HTML' },
  { id: 'text', label: 'Text' },
  { id: 'source', label: 'Source' },
];

const viewports: ReadonlyArray<{
  id: Viewport;
  label: string;
  tooltip: string;
}> = [
  {
    id: 'desktop',
    label: 'Desktop',
    tooltip: 'Desktop preview (d) — 600 px',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    tooltip: 'Mobile preview (m) — 375 px',
  },
];

export type PreviewWorkspaceProps = {
  state: Readonly<ApplicationState>;
  securedHtml: string | null;
  theme?: Record<string, unknown>;
  onSelectTemplate(templateId: string): void;
  onTabChange(tab: PreviewTab): void;
  onViewportChange(viewport: Viewport): void;
  onToggleEmailColorMode(): void;
  onRemoteImagesChange(checked: boolean): void;
  onVariantChange(variant: string): void;
  onPropsTextChange(value: string): void;
  onSendToChange(value: string): void;
  onSendSubjectChange(value: string): void;
  onCopy(format?: PreviewTab): void;
  onDownload(format?: PreviewTab | 'eml'): void;
  onSend(): void;
  onCheckLinks(): void;
  onRetry(): void;
  onDismissError(): void;
  onPreferenceChange(
    key: 'inspectorTab' | 'propsMode' | 'workspaceColorMode' | 'templateFilter',
    value: string,
  ): void;
  onFilterTextChange(value: string): void;
  onPanelChange(
    panel: 'templatesOpen' | 'inspectorOpen' | 'paletteOpen',
    open: boolean,
  ): void;
  onFrameSizeChange(width: number, height: number): void;
  onResetFrame(): void;
  onResetProps(): void;
};

export function PreviewRoot(props: PreviewWorkspaceProps) {
  const system = useMemo(() => createPreviewSystem(props.theme), [props.theme]);

  return (
    <ChakraProvider value={system}>
      <PreviewWorkspace {...props} />
    </ChakraProvider>
  );
}

function PreviewWorkspace(props: PreviewWorkspaceProps) {
  const { state } = props;
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.workspace,
    previewWorkspaceSlotRecipe,
  );
  const styles = recipe({
    templatesOpen: state.templatesOpen,
    inspectorOpen: state.inspectorOpen,
  });
  const viewerRecipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.viewer,
    previewViewerSlotRecipe,
  );
  const viewerStyles = viewerRecipe();
  const [screenWidth, setScreenWidth] = useState(() => window.innerWidth);
  const paletteTrigger = useRef<HTMLButtonElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const selected = state.templates.find(
    (template) => template.id === state.selectedId,
  );
  const openChecks = () => {
    props.onPreferenceChange('inspectorTab', 'checks');
    props.onPanelChange('inspectorOpen', true);
  };
  useEffect(() => {
    const resize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing =
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        props.onPanelChange('paletteOpen', !state.paletteOpen);
        return;
      }
      if (editing || event.metaKey || event.ctrlKey || event.altKey) return;
      const view = tabs[Number(event.key) - 1];
      if (view && /^[1-5]$/.test(event.key)) props.onTabChange(view.id);
      else if (event.key === '/') {
        event.preventDefault();
        props.onPanelChange('templatesOpen', true);
        window.setTimeout(
          () => document.getElementById('template-filter')?.focus(),
          0,
        );
      } else if (event.key === 'd' || event.key === 'm')
        props.onViewportChange(event.key === 'd' ? 'desktop' : 'mobile');
      else if (event.key === 'l') props.onToggleEmailColorMode();
      else if (event.key === '[')
        props.onPanelChange('templatesOpen', !state.templatesOpen);
      else if (event.key === ']')
        props.onPanelChange('inspectorOpen', !state.inspectorOpen);
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [props, state]);
  const sidebar = (
    <>
      <Stack css={styles.sidebarHeader}>
        <Box position="relative" w="full">
          <Input
            id="template-filter"
            ref={filterRef}
            aria-label="Filter templates"
            placeholder="Filter templates"
            fontWeight="normal"
            letterSpacing="normal"
            value={state.filterText}
            pr="8"
            size="sm"
            onInput={(e) => props.onFilterTextChange(e.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                if (state.filterText) props.onFilterTextChange('');
                else event.currentTarget.blur();
              }
            }}
          />
          <Text
            aria-hidden="true"
            position="absolute"
            right="3"
            top="1.5"
            color="preview.textMuted"
          >
            /
          </Text>
        </Box>
        <Flex
          css={styles.viewportControl}
          w="full"
          role="group"
          aria-label="Template filter"
          onKeyDown={moveSegmentFocus}
        >
          {(['all', 'issues'] as const).map((filter) => (
            <Button
              key={filter}
              flex="1"
              size="xs"
              variant="ghost"
              aria-pressed={state.templateFilter === filter}
              bg={
                state.templateFilter === filter ? 'preview.soft' : 'transparent'
              }
              onClick={() => props.onPreferenceChange('templateFilter', filter)}
            >
              {filter === 'all' ? 'All' : 'With issues'}{' '}
              {filter === 'all'
                ? state.templates.length
                : state.templates.filter((t) =>
                    (state.templateFindings[t.id] ?? []).some(
                      (f) => f.severity !== 'info',
                    ),
                  ).length}
            </Button>
          ))}
        </Flex>
      </Stack>
      <Box
        as="nav"
        aria-label="Email templates"
        className="template-list"
        css={styles.templateNav}
      >
        <TemplateList
          {...props}
          onSelectTemplate={(id) => {
            props.onSelectTemplate(id);
            if (screenWidth < 760) props.onPanelChange('templatesOpen', false);
          }}
        />
      </Box>
      <Flex css={styles.sidebarFooter} role="status">
        <Box
          aria-hidden="true"
          boxSize="1.5"
          borderRadius="full"
          bg={
            state.connection === 'connected'
              ? 'preview.success'
              : state.connection === 'reconnecting'
                ? 'preview.warning'
                : 'preview.textMuted'
          }
        />
        {state.connection === 'connected'
          ? 'Watching · rebuilt ' +
            (state.lastRenderedAt && Date.now() - state.lastRenderedAt >= 5000
              ? Math.floor((Date.now() - state.lastRenderedAt) / 1000) + 's ago'
              : 'just now')
          : state.connection === 'connecting'
            ? 'Connecting…'
            : 'Reconnecting…'}
      </Flex>
    </>
  );
  return (
    <Tabs.Root
      unstyled
      value={state.activeTab}
      id="preview-formats"
      ids={{ trigger: (value) => 'tab-' + value }}
      activationMode="automatic"
      loopFocus
      onValueChange={(details) =>
        props.onTabChange(details.value as PreviewTab)
      }
      asChild
    >
      <Grid
        className="preview-app"
        css={styles.root}
        data-templates-open={state.templatesOpen}
        data-inspector-open={state.inspectorOpen}
      >
        <Flex as="header" className="topbar" css={styles.header}>
          <Flex className="brand" css={styles.brand}>
            <Grid aria-hidden="true" css={styles.brandMark}>
              ce
            </Grid>
            <Text as="strong" fontSize="sm" whiteSpace="nowrap">
              Chakra Email
            </Text>
            <Text aria-hidden="true" color="preview.textMuted">
              /
            </Text>
            <Heading as="h1" css={styles.title}>
              {selected?.group &&
              new Set(state.templates.map((template) => template.group ?? ''))
                .size > 1
                ? selected.group + ' / '
                : ''}
              {shortTemplateName(
                state.result?.name ?? selected?.name ?? 'Choose a template',
              )}
            </Heading>
            {selected?.path ? (
              <Code title={selected.path} css={styles.path}>
                {selected.path}
              </Code>
            ) : null}
          </Flex>
          <Tabs.List aria-label="Email output format" css={viewerStyles.tabs}>
            {tabs.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                data-tab={tab.id}
                aria-label={tab.label}
                css={viewerStyles.tab}
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Flex css={styles.headerActions}>
            <Flex
              role="group"
              aria-label="Preview viewport"
              onKeyDown={moveSegmentFocus}
              css={styles.viewportControl}
            >
              {viewports.map((viewport) => (
                <PreviewTooltip key={viewport.id} content={viewport.tooltip}>
                  <PreviewIconButton
                    type="button"
                    aria-label={viewport.label + ' preview'}
                    data-viewport={viewport.id}
                    aria-pressed={state.viewport === viewport.id}
                    disabled={
                      !state.result ||
                      !['preview', 'compare'].includes(state.activeTab)
                    }
                    variant="ghost"
                    bg={
                      state.viewport === viewport.id
                        ? 'preview.soft'
                        : 'transparent'
                    }
                    onClick={() => props.onViewportChange(viewport.id)}
                  >
                    <ViewportIcon viewport={viewport.id} />
                  </PreviewIconButton>
                </PreviewTooltip>
              ))}
            </Flex>
            <Flex
              role="group"
              aria-label="Email color"
              onKeyDown={moveSegmentFocus}
              css={styles.viewportControl}
            >
              {(['light', 'dark'] as const).map((mode) => (
                <PreviewTooltip
                  key={mode}
                  content={
                    (mode === 'light' ? 'Light client' : 'Dark client') + ' (l)'
                  }
                >
                  <PreviewIconButton
                    aria-label={'Preview email in ' + mode + ' mode'}
                    data-action={
                      mode !== state.emailColorMode
                        ? 'toggle-email-color-mode'
                        : undefined
                    }
                    data-email-color-mode={mode}
                    aria-pressed={state.emailColorMode === mode}
                    disabled={!state.result}
                    variant="ghost"
                    bg={
                      state.emailColorMode === mode
                        ? 'preview.soft'
                        : 'transparent'
                    }
                    onClick={() => {
                      if (mode !== state.emailColorMode)
                        props.onToggleEmailColorMode();
                    }}
                  >
                    <ActionIcon name={mode === 'light' ? 'sun' : 'moon'} />
                  </PreviewIconButton>
                </PreviewTooltip>
              ))}
            </Flex>
            <PreviewTooltip content="Open command palette (⌘K / Ctrl K)">
              <PreviewIconButton
                ref={paletteTrigger}
                aria-label="Open command palette"
                data-action="palette"
                variant="outline"
                onClick={() => props.onPanelChange('paletteOpen', true)}
              >
                <ActionIcon name="search" />
              </PreviewIconButton>
            </PreviewTooltip>
            {state.canTestSend ? (
              <Popover.Root positioning={{ placement: 'bottom-end' }}>
                <Popover.Trigger asChild>
                  <Button
                    size="sm"
                    css={styles.primaryAction}
                    data-action="open-send"
                  >
                    Send test
                  </Button>
                </Popover.Trigger>
                <Portal>
                  <Popover.Positioner>
                    <Popover.Content
                      bg="preview.panel"
                      color="preview.text"
                      borderColor="preview.border"
                      p="4"
                      w="340px"
                    >
                      <Popover.Title fontWeight="semibold">
                        Send this render to
                      </Popover.Title>
                      <SendPanel {...props} />
                    </Popover.Content>
                  </Popover.Positioner>
                </Portal>
              </Popover.Root>
            ) : null}
            <ExportMenu {...props} />
          </Flex>
        </Flex>
        <Grid className="application-body" css={styles.body}>
          {screenWidth >= 760 ? (
            <Grid
              as="aside"
              id="preview-templates"
              className="sidebar"
              hidden={!state.templatesOpen}
              css={styles.sidebar}
            >
              {sidebar}
            </Grid>
          ) : null}
          <Box as="main" className="workspace" css={styles.main}>
            {state.error ? (
              <PreviewError
                message={state.error}
                onRetry={props.onRetry}
                onDismiss={props.onDismissError}
              />
            ) : null}
            <Grid className="workspace-content" css={styles.content}>
              <Grid css={styles.viewerColumn}>
                <Box className="viewer-card" css={viewerStyles.root}>
                  {tabs.map((tab) => (
                    <Tabs.Content
                      key={tab.id}
                      value={tab.id}
                      css={viewerStyles.content}
                      tabIndex={0}
                    >
                      {state.activeTab === tab.id ? (
                        <Viewer {...props} />
                      ) : null}
                    </Tabs.Content>
                  ))}
                </Box>
                <StatusBar {...props} onOpenChecks={openChecks} />
              </Grid>
              {screenWidth >= 1100 ? (
                <Box
                  id="preview-inspector"
                  hidden={!state.inspectorOpen}
                  css={styles.inspectorPanel}
                >
                  <Inspector {...props} />
                </Box>
              ) : null}
            </Grid>
          </Box>
        </Grid>
        {screenWidth < 760 ? (
          <PanelSheet
            title="Email templates"
            side="left"
            open={state.templatesOpen}
            onOpenChange={(open) => props.onPanelChange('templatesOpen', open)}
          >
            <Grid id="preview-templates" css={styles.sidebar} h="full">
              {sidebar}
            </Grid>
          </PanelSheet>
        ) : null}
        {screenWidth < 1100 ? (
          <PanelSheet
            title="Preview settings"
            side="right"
            open={state.inspectorOpen}
            onOpenChange={(open) => props.onPanelChange('inspectorOpen', open)}
          >
            <Inspector {...props} />
          </PanelSheet>
        ) : null}
        <Palette {...props} returnFocusRef={paletteTrigger} />
      </Grid>
    </Tabs.Root>
  );
}

function PanelSheet({
  title,
  side,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  side: 'left' | 'right';
  open: boolean;
  onOpenChange(open: boolean): void;
  children: ReactElement;
}) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={({ open }) => onOpenChange(open)}
      placement={side === 'left' ? 'top' : 'top'}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner
          p="0"
          justifyContent={side === 'left' ? 'flex-start' : 'flex-end'}
        >
          <Dialog.Content
            h="100dvh"
            maxH="100dvh"
            m="0"
            w="min(340px, 100vw)"
            borderRadius="0"
            bg="preview.panel"
            color="preview.text"
          >
            <VisuallyHidden>
              <Dialog.Title>{title}</Dialog.Title>
            </VisuallyHidden>
            <Dialog.CloseTrigger asChild>
              <PreviewIconButton
                aria-label={'Close ' + title.toLowerCase()}
                position="absolute"
                top="2"
                right="2"
                zIndex="1"
                variant="ghost"
              >
                <ActionIcon name="close" />
              </PreviewIconButton>
            </Dialog.CloseTrigger>
            {children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function StatusBar(props: PreviewWorkspaceProps & { onOpenChecks(): void }) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.workspace,
    previewWorkspaceSlotRecipe,
  );
  const stats = messageStats(props.state.result?.html ?? '');
  const counts = findingCounts(props.state.result?.lint ?? []);
  const tally = tallyLabel(counts);
  const preset = props.state.viewport === 'mobile' ? 375 : 600;
  return (
    <Flex className="preview-statusbar" css={recipe().statusbar}>
      <Flex gap="1" align="center" fontFamily="previewMono">
        <Text>
          {props.state.frameWidth} × {props.state.frameHeight ?? '—'}
        </Text>
        {props.state.frameWidth !== preset ||
        (props.state.frameHeight !== null &&
          props.state.frameHeight !== 842) ? (
          <PreviewTooltip content={'Restore ' + preset + ' px'}>
            <PreviewIconButton
              size="xs"
              aria-label={'Restore ' + preset + ' px'}
              data-action="reset-frame"
              variant="ghost"
              onClick={props.onResetFrame}
            >
              <ActionIcon name="reset" />
            </PreviewIconButton>
          </PreviewTooltip>
        ) : null}
      </Flex>
      <Flex
        align="center"
        gap="2"
        title="Rendered HTML size in UTF-8 bytes"
        flexWrap="wrap"
      >
        <Text>{formatBytes(stats.bytes)}</Text>
        <Box
          w="72px"
          h="4px"
          bg="preview.soft"
          borderRadius="full"
          overflow="hidden"
          role="meter"
          aria-label="Gmail clipping threshold"
          aria-valuenow={Math.min(stats.bytes, 102 * 1024)}
          aria-valuetext={formatBytes(stats.bytes) + ' of 102 KB'}
          aria-valuemin={0}
          aria-valuemax={102 * 1024}
        >
          <Box
            h="full"
            w={Math.min(100, (stats.bytes / (102 * 1024)) * 100) + '%'}
            bg={
              stats.bytes >= 102 * 1024
                ? 'preview.danger'
                : stats.bytes >= 0.8 * 102 * 1024
                  ? 'preview.warning'
                  : 'preview.success'
            }
          />
        </Box>
        <Text>of 102 KB before Gmail clips</Text>
      </Flex>
      <Text>
        {stats.links} links · {stats.images} images
      </Text>
      <Button
        size="xs"
        variant="ghost"
        data-action="open-checks"
        className="lint-summary"
        data-lint-count={props.state.result?.lint.length ?? 0}
        aria-label={tally + '. Open checks.'}
        onClick={props.onOpenChecks}
      >
        {(['error', 'warning', 'info'] as const)
          .filter((severity) => counts[severity])
          .map((severity) => (
            <Flex key={severity} as="span" align="center" gap="1.5">
              <Box
                as="span"
                aria-hidden="true"
                boxSize="1.5"
                borderRadius="full"
                bg={lintSeverityColor(severity)}
              />
              <Text as="span">
                {counts[severity]}{' '}
                {severity === 'info'
                  ? 'info'
                  : severity + (counts[severity] === 1 ? '' : 's')}
              </Text>
            </Flex>
          ))}
        {!props.state.result?.lint.length ? 'No issues' : null}
      </Button>
      <PreviewTooltip
        content="Scripts and forms are disabled. Remote images stay blocked until you turn this on."
        triggerId="remote-images-control"
      >
        <Switch.Root
          ids={{ root: 'remote-images-control', hiddenInput: 'remote-images' }}
          checked={props.state.remoteImages}
          disabled={!['preview', 'compare'].includes(props.state.activeTab)}
          onCheckedChange={({ checked }) => props.onRemoteImagesChange(checked)}
          marginLeft="auto"
          css={recipe().remoteControl}
        >
          <Tooltip.Context>
            {(tooltip) => (
              <Switch.HiddenInput
                aria-describedby={
                  tooltip.open ? tooltip.getContentProps().id : undefined
                }
              />
            )}
          </Tooltip.Context>
          <Switch.Control
            bg="preview.borderStrong"
            _checked={{ bg: 'preview.accentStrong' }}
          >
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Label>Remote images</Switch.Label>
        </Switch.Root>
      </PreviewTooltip>
      <VisuallyHidden role="status" aria-atomic="true" data-copy-status="">
        {props.state.copied
          ? 'Copied ' +
            (props.state.activeTab === 'text'
              ? 'text'
              : props.state.activeTab === 'source'
                ? 'source'
                : 'HTML') +
            ' to clipboard'
          : ''}
      </VisuallyHidden>
    </Flex>
  );
}

function ExportMenu(props: PreviewWorkspaceProps) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.workspace,
    previewWorkspaceSlotRecipe,
  );
  const format = props.state.activeTab;
  return (
    <Menu.Root positioning={{ placement: 'bottom-end' }}>
      <PreviewTooltip content="Export email">
        <Menu.Trigger asChild>
          <PreviewIconButton
            aria-label="Export email"
            data-action="export"
            disabled={!props.state.result}
            css={recipe().secondaryAction}
          >
            <ActionIcon name="download" />
          </PreviewIconButton>
        </Menu.Trigger>
      </PreviewTooltip>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            bg="preview.panel"
            color="preview.text"
            borderColor="preview.border"
          >
            <Menu.Item
              value="copy-html"
              data-action={
                ['preview', 'compare', 'html'].includes(format)
                  ? 'copy'
                  : undefined
              }
              aria-label="Copy HTML"
              onClick={() => props.onCopy('html')}
            >
              Copy HTML
            </Menu.Item>
            <Menu.Item
              value="copy-text"
              data-action={format === 'text' ? 'copy' : undefined}
              aria-label="Copy text"
              onClick={() => props.onCopy('text')}
            >
              Copy plain text
            </Menu.Item>
            {format === 'source' ? (
              <Menu.Item
                value="copy-source"
                data-action="copy"
                aria-label="Copy source"
                onClick={() => props.onCopy('source')}
              >
                Copy source
              </Menu.Item>
            ) : null}
            <Menu.Item
              value="download-eml"
              onClick={() => props.onDownload('eml')}
            >
              Download .eml
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item
              value="download-html"
              data-action={
                ['preview', 'compare', 'html'].includes(format)
                  ? 'download'
                  : undefined
              }
              aria-label="Download HTML"
              onClick={() => props.onDownload('html')}
            >
              Download .html
            </Menu.Item>
            <Menu.Item
              value="download-text"
              data-action={format === 'text' ? 'download' : undefined}
              aria-label="Download text"
              onClick={() => props.onDownload('text')}
            >
              Download .txt
            </Menu.Item>
            {format === 'source' ? (
              <Menu.Item
                value="download-source"
                data-action="download"
                aria-label="Download source"
                onClick={() => props.onDownload('source')}
              >
                Download source
              </Menu.Item>
            ) : null}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}

function Palette(
  props: PreviewWorkspaceProps & {
    returnFocusRef: React.RefObject<HTMLButtonElement | null>;
  },
) {
  const [query, setQuery] = useState('');
  const queryRef = useRef<HTMLInputElement>(null);
  const commands = [
    ...props.state.templates.map((t) => ({
      label: t.name,
      run: () => props.onSelectTemplate(t.id),
    })),
    ...tabs.map((tab) => ({
      label: 'View: ' + tab.label,
      run: () => props.onTabChange(tab.id),
    })),
    ...viewports.map((v) => ({
      label: v.label + ' preview',
      run: () => props.onViewportChange(v.id),
    })),
    { label: 'Toggle email light/dark', run: props.onToggleEmailColorMode },
    {
      label: 'Toggle remote images',
      run: () => props.onRemoteImagesChange(!props.state.remoteImages),
    },
    {
      label: 'Toggle sidebar',
      run: () =>
        props.onPanelChange('templatesOpen', !props.state.templatesOpen),
    },
    {
      label: 'Toggle inspector',
      run: () =>
        props.onPanelChange('inspectorOpen', !props.state.inspectorOpen),
    },
    ...(['system', 'light', 'dark'] as const).map((mode) => ({
      label: 'Interface theme: ' + mode,
      run: () => props.onPreferenceChange('workspaceColorMode', mode),
    })),
    { label: 'Copy HTML', run: () => props.onCopy('html') },
    ...(props.state.canCheckLinks
      ? [{ label: 'Check links', run: props.onCheckLinks }]
      : []),
  ].filter((c) => c.label.toLowerCase().includes(query.toLowerCase()));
  const [active, setActive] = useState(0);
  const run = (index: number) => {
    commands[index]?.run();
    props.onPanelChange('paletteOpen', false);
    setQuery('');
    setActive(0);
  };
  return (
    <Dialog.Root
      open={props.state.paletteOpen}
      onOpenChange={({ open }) => props.onPanelChange('paletteOpen', open)}
      finalFocusEl={() => props.returnFocusRef.current}
      initialFocusEl={() => queryRef.current}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg="preview.panel"
            color="preview.text"
            borderColor="preview.border"
          >
            <Dialog.Header>
              <Dialog.Title>Command palette</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb="4">
              <Input
                ref={queryRef}
                aria-label="Find a command"
                placeholder="Find a template or command…"
                value={query}
                role="combobox"
                aria-expanded="true"
                aria-controls="preview-commands"
                aria-activedescendant={
                  commands[active] ? 'command-' + active : undefined
                }
                onInput={(e) => {
                  setQuery(e.currentTarget.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive(
                      (i) =>
                        (i +
                          (e.key === 'ArrowDown' ? 1 : -1) +
                          commands.length) %
                        Math.max(commands.length, 1),
                    );
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    run(active);
                  }
                }}
              />
              <Stack
                id="preview-commands"
                role="listbox"
                aria-label="Commands"
                mt="3"
                maxH="50dvh"
                overflowY="auto"
                gap="1"
              >
                {commands.map((c, i) => (
                  <Button
                    key={c.label}
                    id={'command-' + i}
                    role="option"
                    aria-selected={i === active}
                    tabIndex={-1}
                    justifyContent="start"
                    variant="ghost"
                    bg={i === active ? 'preview.soft' : 'transparent'}
                    onClick={() => run(i)}
                  >
                    {c.label}
                  </Button>
                ))}
                {!commands.length ? (
                  <Text p="3" color="preview.textMuted">
                    No matching commands
                  </Text>
                ) : null}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function messageStats(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return {
    bytes: new TextEncoder().encode(html).length,
    links: doc.querySelectorAll('a[href]').length,
    images: doc.querySelectorAll('img').length,
    previewText:
      doc
        .querySelector(
          '[data-chakra-email-preview], [data-preview], [style*="display:none"], [style*="display: none"]',
        )
        ?.textContent?.replace(/[\u200b-\u200d\ufeff\u00a0]/gu, ' ')
        .replace(/\s+/gu, ' ')
        .trim() ?? '',
  };
}

function moveSegmentFocus(event: React.KeyboardEvent<HTMLDivElement>) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  const buttons = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      'button:not([disabled])',
    ),
  ];
  const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (current < 0 || !buttons.length) return;
  event.preventDefault();
  const index =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) %
          buttons.length;
  buttons[index]?.focus();
  buttons[index]?.click();
}

function formatBytes(bytes: number) {
  return (bytes / 1024).toFixed(1) + ' KB';
}
function findingCounts(findings: LintFinding[]) {
  return {
    error: findings.filter((f) => f.severity === 'error').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
    info: findings.filter((f) => f.severity === 'info').length,
  };
}
function tallyLabel(counts: ReturnType<typeof findingCounts>) {
  return (
    (['error', 'warning', 'info'] as const)
      .filter((s) => counts[s])
      .map(
        (s) =>
          counts[s] +
          ' ' +
          (s === 'info' ? 'info' : s + (counts[s] === 1 ? '' : 's')),
      )
      .join(', ') || 'No issues'
  );
}

function TemplateList(props: PreviewWorkspaceProps) {
  const { state } = props;
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.templates,
    previewTemplatesSlotRecipe,
  );
  if (state.loadingTemplates && !state.templates.length)
    return (
      <Stack aria-label="Loading templates" css={recipe().loading}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} h="8" />
        ))}
      </Stack>
    );
  if (!state.templates.length)
    return (
      <Stack className="empty-sidebar" css={recipe().empty}>
        <Text as="strong">No templates found</Text>
        <Text>
          Add an email template matching your configured include pattern.
        </Text>
        <Button size="sm" data-action="retry" onClick={props.onRetry}>
          Rescan templates
        </Button>
      </Stack>
    );
  const filtered = state.templates.filter(
    (t) =>
      (t.name + ' ' + (t.path ?? ''))
        .toLowerCase()
        .includes(state.filterText.toLowerCase()) &&
      (state.templateFilter === 'all' ||
        (state.templateFindings[t.id] ?? []).some(
          (f) => f.severity !== 'info',
        )),
  );
  const groupName = (t: ApplicationState['templates'][number]) => t.group ?? '';
  const groups = [...new Set(state.templates.map(groupName))].sort();
  return (
    <Stack css={recipe().list}>
      {!filtered.length ? (
        <Text p="3" fontSize="xs" color="preview.textMuted">
          No matching templates
        </Text>
      ) : null}
      {groups.map((group) => {
        const templates = filtered
          .filter((t) => groupName(t) === group)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!templates.length) return null;
        return (
          <Box key={group}>
            {groups.length > 1 && group ? (
              <Flex
                justify="space-between"
                px="2"
                pt="5"
                pb="2"
                fontSize="11px"
                textTransform="uppercase"
                color="preview.textMuted"
              >
                <Text>{group}</Text>
                <Text>{templates.length}</Text>
              </Flex>
            ) : null}
            {templates.map((template) => {
              const findings = state.templateFindings[template.id] ?? [];
              const counts = findingCounts(findings);
              const severity = counts.error
                ? 'error'
                : counts.warning
                  ? 'warning'
                  : 'info';
              return (
                <PreviewTooltip
                  key={template.id}
                  content={template.path ?? template.name}
                >
                  <Button
                    className="template-item"
                    data-template-id={template.id}
                    aria-current={
                      template.id === state.selectedId ? 'page' : undefined
                    }
                    aria-label={
                      shortTemplateName(template.name) +
                      (findings.length ? ', ' + tallyLabel(counts) : '')
                    }
                    css={
                      recipe({ selected: template.id === state.selectedId })
                        .item
                    }
                    variant="ghost"
                    onClick={() => props.onSelectTemplate(template.id)}
                  >
                    <Text truncate>{shortTemplateName(template.name)}</Text>
                    {findings.length ? (
                      <Flex
                        align="center"
                        gap="1.5"
                        color="preview.textMuted"
                        fontSize="11px"
                      >
                        <Box
                          aria-hidden="true"
                          boxSize="1.5"
                          borderRadius="full"
                          bg={lintSeverityColor(severity)}
                        />
                        {findings.length}
                      </Flex>
                    ) : null}
                  </Button>
                </PreviewTooltip>
              );
            })}
          </Box>
        );
      })}
    </Stack>
  );
}

function Inspector(props: PreviewWorkspaceProps) {
  const { state } = props;
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.inspector,
    previewInspectorSlotRecipe,
  );
  const styles = recipe();
  let fields: Array<{ path: string[]; value: unknown }> = [];
  try {
    const walk = (value: unknown, path: string[]) => {
      if (value && typeof value === 'object' && !Array.isArray(value))
        Object.entries(value).forEach(([key, item]) =>
          walk(item, [...path, key]),
        );
      else fields.push({ path, value });
    };
    walk(JSON.parse(state.propsText), []);
  } catch {
    fields = [];
  }
  const stats = messageStats(state.result?.html ?? '');
  const passed = state.lintRules.filter(
    (rule) =>
      state.result?.rulesRun?.includes(rule.id) &&
      !state.result.lint.some((finding) => finding.ruleId === rule.id),
  );
  const updateField = (path: string[], value: unknown) => {
    const draft = JSON.parse(state.propsText);
    let parent = draft;
    for (const key of path.slice(0, -1)) parent = parent[key];
    Object.defineProperty(parent, path[path.length - 1], {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    props.onPropsTextChange(JSON.stringify(draft, null, 2));
  };
  return (
    <Tabs.Root
      unstyled
      value={state.inspectorTab}
      onValueChange={({ value }) =>
        props.onPreferenceChange('inspectorTab', value)
      }
      asChild
    >
      <Stack
        as="aside"
        className="inspector"
        aria-label="Preview settings"
        css={styles.root}
      >
        <Tabs.List aria-label="Inspector" css={styles.header}>
          {(['props', 'info', 'checks'] as const).map((tab) => (
            <Tabs.Trigger
              key={tab}
              value={tab}
              data-inspector-tab={tab}
              px="2"
              py="3"
              color="preview.textMuted"
              _selected={{
                color: 'preview.text',
                borderBottomColor: 'preview.text',
              }}
              borderBottomWidth="2px"
              borderColor="transparent"
            >
              {tab[0].toUpperCase() + tab.slice(1)}
              {tab === 'checks' && state.result?.lint.length ? (
                <Badge
                  ml="1"
                  color={lintSeverityColor(
                    state.result.lint.some((f) => f.severity === 'error')
                      ? 'error'
                      : state.result.lint.some((f) => f.severity === 'warning')
                        ? 'warning'
                        : 'info',
                  )}
                >
                  {state.result.lint.length}
                </Badge>
              ) : null}
              {tab === 'props' && state.propsError ? (
                <Text
                  as="span"
                  color="preview.warning"
                  aria-label="Invalid props"
                >
                  {' '}
                  ●
                </Text>
              ) : null}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="props" p="4">
          <Stack gap="4">
            <Flex justify="space-between" align="center" gap="2">
              <Flex
                role="group"
                aria-label="Props editor mode"
                onKeyDown={moveSegmentFocus}
                bg="preview.raised"
                p="0.5"
                borderRadius="md"
                borderWidth="1px"
                borderColor="preview.border"
              >
                {(['fields', 'json'] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="xs"
                    variant="ghost"
                    aria-pressed={state.propsMode === mode}
                    data-props-mode={mode}
                    bg={
                      state.propsMode === mode ? 'preview.soft' : 'transparent'
                    }
                    onClick={() => props.onPreferenceChange('propsMode', mode)}
                  >
                    {mode === 'fields' ? 'Fields' : 'JSON'}
                  </Button>
                ))}
              </Flex>
              <Button
                size="xs"
                variant="plain"
                color="preview.textMuted"
                textDecoration="underline"
                data-action="reset-props"
                disabled={!state.result}
                onClick={props.onResetProps}
              >
                Reset props
              </Button>
            </Flex>
            {state.propsMode === 'fields' &&
            fields.length &&
            fields.length <= 20 &&
            !fields.some((f) => Array.isArray(f.value)) ? (
              fields.map(({ path, value }) => (
                <Field.Root key={path.join('.')} disabled={!state.result}>
                  <Flex justify="space-between" w="full">
                    <Field.Label
                      htmlFor={'prop-' + path.join('.')}
                      css={styles.fieldLabel}
                    >
                      {path.join('.')}
                    </Field.Label>
                    <Text
                      fontFamily="previewMono"
                      color="preview.textMuted"
                      fontSize="11px"
                    >
                      {value === null ? 'null' : typeof value}
                    </Text>
                  </Flex>
                  {typeof value === 'boolean' ? (
                    <Switch.Root
                      checked={value}
                      onCheckedChange={({ checked }) =>
                        updateField(path, checked)
                      }
                    >
                      <Switch.HiddenInput id={'prop-' + path.join('.')} />
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch.Root>
                  ) : (
                    <Input
                      id={'prop-' + path.join('.')}
                      type={typeof value === 'number' ? 'number' : 'text'}
                      value={String(value ?? '')}
                      css={styles.sendInput}
                      onInput={(e) =>
                        updateField(
                          path,
                          typeof value === 'number'
                            ? e.currentTarget.value === ''
                              ? ''
                              : Number(e.currentTarget.value)
                            : value === null && !e.currentTarget.value
                              ? null
                              : e.currentTarget.value,
                        )
                      }
                    />
                  )}
                </Field.Root>
              ))
            ) : (
              <Field.Root
                invalid={Boolean(state.propsError)}
                disabled={!state.result}
              >
                <Field.Label htmlFor="preview-props" css={styles.fieldLabel}>
                  JSON props
                </Field.Label>
                {state.propsMode === 'fields' ? (
                  <Text fontSize="xs" color="preview.textMuted">
                    Edit in JSON
                  </Text>
                ) : null}
                <Textarea
                  id="preview-props"
                  value={state.propsText}
                  css={styles.textarea}
                  aria-describedby={
                    'props-help' + (state.propsError ? ' props-error' : '')
                  }
                  aria-invalid={Boolean(state.propsError)}
                  spellCheck={false}
                  onInput={(e) =>
                    props.onPropsTextChange(e.currentTarget.value)
                  }
                />
              </Field.Root>
            )}
            {state.propsError ? (
              <Text
                id="props-error"
                role="alert"
                color="preview.danger"
                fontSize="xs"
              >
                {state.propsError}
              </Text>
            ) : null}
            <Text
              id="props-help"
              fontSize="xs"
              lineHeight="1.7"
              color="preview.textMuted"
              p="3"
              borderWidth="1px"
              borderColor="preview.border"
              borderRadius="md"
            >
              Updates the preview as you type. Your template files aren't
              changed.
            </Text>
          </Stack>
        </Tabs.Content>
        <Tabs.Content value="info" p="4">
          <Stack gap="5">
            {[
              {
                title: 'Envelope',
                entries: [
                  ['From', 'Not set'],
                  ['To', state.sendTo || '—'],
                  ['Subject', state.result?.subject || '—'],
                  ['Preview text', stats.previewText || 'No preview text'],
                ],
              },
              {
                title: 'Message',
                entries: [
                  ['HTML', formatBytes(stats.bytes)],
                  [
                    'Plain text',
                    formatBytes(
                      new TextEncoder().encode(state.result?.text ?? '').length,
                    ),
                  ],
                  ['Images', String(stats.images)],
                  ['Links', String(stats.links)],
                  [
                    'Render',
                    state.result?.renderMs !== undefined
                      ? state.result.renderMs + ' ms'
                      : '—',
                  ],
                ],
              },
              {
                title: 'Source',
                entries: [
                  [
                    'Template',
                    state.templates.find((t) => t.id === state.selectedId)
                      ?.path ?? '—',
                  ],
                  ['Variant', state.selectedVariant || 'Default'],
                ],
              },
            ].map((section) => (
              <Box key={section.title}>
                <Heading as="h3" css={styles.eyebrow}>
                  {section.title}
                </Heading>
                <Box as="dl">
                  {section.entries.map(([label, value]) => (
                    <Grid
                      key={label}
                      gridTemplateColumns="84px minmax(0, 1fr)"
                      gap="2"
                      py="1.5"
                      fontSize="xs"
                    >
                      <Text as="dt" color="preview.textMuted">
                        {label}
                      </Text>
                      <Text as="dd" overflowWrap="anywhere">
                        {value}
                      </Text>
                    </Grid>
                  ))}
                </Box>
              </Box>
            ))}
            <Flex gap="2" flexWrap="wrap">
              <Button
                size="xs"
                variant="outline"
                onClick={() => props.onCopy('html')}
              >
                Copy HTML
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => props.onCopy('text')}
              >
                Copy plain text
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => props.onDownload('html')}
              >
                Download .html
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => props.onDownload('text')}
              >
                Download .txt
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => props.onDownload('eml')}
              >
                Download .eml
              </Button>
            </Flex>
          </Stack>
        </Tabs.Content>
        <Tabs.Content value="checks" p="4">
          <Stack gap="5">
            <Grid gridTemplateColumns="repeat(4, 1fr)" gap="2">
              {(['error', 'warning', 'info'] as const).map((s) => (
                <Stack
                  key={s}
                  gap="1"
                  borderWidth="1px"
                  borderColor="preview.border"
                  borderRadius="md"
                  p="2"
                >
                  <Text
                    fontSize="xl"
                    color={
                      findingCounts(state.result?.lint ?? [])[s]
                        ? lintSeverityColor(s)
                        : 'preview.textMuted'
                    }
                  >
                    {findingCounts(state.result?.lint ?? [])[s]}
                  </Text>
                  <Text fontSize="11px" color="preview.textMuted">
                    {s === 'info'
                      ? 'Info'
                      : s === 'error'
                        ? 'Errors'
                        : 'Warnings'}
                  </Text>
                </Stack>
              ))}
              <Stack
                gap="1"
                borderWidth="1px"
                borderColor="preview.border"
                borderRadius="md"
                p="2"
              >
                <Text
                  fontSize="xl"
                  color={
                    passed.length ? 'preview.success' : 'preview.textMuted'
                  }
                >
                  {passed.length}
                </Text>
                <Text fontSize="11px" color="preview.textMuted">
                  Passed
                </Text>
              </Stack>
            </Grid>
            <Flex align="center" justify="space-between">
              <Text fontSize="xs" color="preview.textMuted">
                Ran on render
                {state.result?.renderMs !== undefined
                  ? ' · ' + state.result.renderMs + ' ms'
                  : ''}
              </Text>
              <Button
                size="xs"
                variant="outline"
                disabled={state.rendering || !state.result}
                onClick={props.onRetry}
              >
                Re-run
              </Button>
            </Flex>
            <LintPanel findings={state.result?.lint ?? null} />
            {state.result?.rulesRun ? (
              <Box as="details">
                <chakra.summary fontSize="xs" cursor="pointer">
                  Passed · {passed.length}
                </chakra.summary>
                <Stack as="ul" mt="3" gap="2">
                  {passed.map((rule) => (
                    <Text
                      as="li"
                      listStyleType="none"
                      key={rule.id}
                      fontSize="xs"
                      color="preview.success"
                    >
                      ✓ {rule.title}
                    </Text>
                  ))}
                </Stack>
              </Box>
            ) : null}
            <Stack gap="2">
              <Flex justify="space-between" align="center">
                <Heading as="h3" fontSize="sm">
                  Links · {stats.links}
                </Heading>
                {state.canCheckLinks ? (
                  <Button
                    size="xs"
                    variant="outline"
                    data-action="check-links"
                    disabled={!state.result || state.rendering}
                    onClick={props.onCheckLinks}
                  >
                    {state.checkingLinks ? 'Checking links…' : 'Check links'}
                  </Button>
                ) : null}
              </Flex>
              <Text role="status" fontSize="xs" color="preview.textMuted">
                {state.result?.linkCheck
                  ? state.result.linkCheck.checked +
                    ' checked (including cached results) · ' +
                    state.result.linkCheck.skipped +
                    ' skipped. Redirect destinations are unverified.'
                  : state.canCheckLinks
                    ? 'Links have not been checked for this render.'
                    : 'Add linkCheck.allowedHosts to check links'}
              </Text>
              {Array.from(
                new DOMParser()
                  .parseFromString(state.result?.html ?? '', 'text/html')
                  .querySelectorAll('a[href]'),
              ).map((a, i) => (
                <Stack
                  key={i}
                  gap="0"
                  borderTopWidth="1px"
                  borderColor="preview.border"
                  py="2"
                >
                  <Text fontSize="xs">{a.textContent || 'Link'}</Text>
                  <Text
                    fontFamily="previewMono"
                    fontSize="11px"
                    color="preview.textMuted"
                    truncate
                    title={a.getAttribute('href') ?? ''}
                  >
                    {a.getAttribute('href')}
                  </Text>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Tabs.Content>
      </Stack>
    </Tabs.Root>
  );
}

function SendPanel(props: PreviewWorkspaceProps) {
  const { state } = props;
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.inspector,
    previewInspectorSlotRecipe,
  );
  const styles = recipe();
  return (
    <Stack
      as="form"
      className="test-send"
      css={styles.sendRoot}
      onSubmit={(event) => {
        event.preventDefault();
        props.onSend();
      }}
    >
      <Box css={styles.sendHeader}>
        <Text css={styles.eyebrow}>Delivery check</Text>
        <Heading as="h3" fontSize="sm">
          Send a test email
        </Heading>
      </Box>
      <Stack css={styles.sendFields}>
        <Field.Root invalid={Boolean(state.sendError)}>
          <Field.Label htmlFor="test-send-to" css={styles.fieldLabel}>
            Recipient
          </Field.Label>
          <Input
            id="test-send-to"
            name="to"
            type="email"
            value={state.sendTo}
            autoComplete="email"
            placeholder="you@example.com"
            css={styles.sendInput}
            aria-describedby={state.sendError ? 'test-send-error' : undefined}
            onInput={(event) => props.onSendToChange(event.currentTarget.value)}
          />
        </Field.Root>
        <Field.Root>
          <Field.Label htmlFor="test-send-subject" css={styles.fieldLabel}>
            Subject
          </Field.Label>
          <Input
            id="test-send-subject"
            name="subject"
            value={state.sendSubject}
            placeholder={state.result?.subject ?? 'Template subject'}
            css={styles.sendInput}
            onInput={(event) =>
              props.onSendSubjectChange(event.currentTarget.value)
            }
          />
        </Field.Root>
      </Stack>
      <Button
        type="submit"
        data-action="test-send"
        disabled={
          !state.result ||
          state.sending ||
          state.rendering ||
          state.propsDirty ||
          Boolean(state.propsError)
        }
        css={styles.sendAction}
      >
        {state.sending ? (
          <>
            <Spinner size="xs" />
            Sending
          </>
        ) : (
          'Send test'
        )}
      </Button>
      {state.sendError ? (
        <Text
          id="test-send-error"
          role="alert"
          color="preview.danger"
          css={styles.sendFeedback}
        >
          {state.sendError}
        </Text>
      ) : state.sendMessage ? (
        <Text role="status" color="preview.accent" css={styles.sendFeedback}>
          {state.sendMessage}
        </Text>
      ) : null}
      <Text color="preview.textMuted" fontSize="xs">
        Sends the current props and variant through testSend in
        chakra-email.config.ts.
      </Text>
    </Stack>
  );
}

function LintPanel({ findings }: { findings: LintFinding[] | null }) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.inspector,
    previewInspectorSlotRecipe,
  );
  const styles = recipe();
  const errors =
    findings?.filter((finding) => finding.severity === 'error').length ?? 0;
  const warnings =
    findings?.filter((finding) => finding.severity === 'warning').length ?? 0;

  return (
    <Stack className="lint-panel" css={styles.lintRoot}>
      <Flex css={styles.lintHeader}>
        <Box>
          <Text css={styles.eyebrow}>Email lint</Text>
          <Heading as="h3" fontSize="sm">
            Client checks
          </Heading>
        </Box>
        {findings ? (
          <Badge
            color={
              errors > 0
                ? 'preview.danger'
                : warnings > 0
                  ? 'preview.warning'
                  : 'preview.accent'
            }
            bg={
              errors > 0
                ? 'preview.dangerSoft'
                : warnings > 0
                  ? 'preview.warningSoft'
                  : 'preview.accentSoft'
            }
          >
            {findings.length}
          </Badge>
        ) : null}
      </Flex>

      {!findings ? (
        <Text color="preview.textMuted" fontSize="xs">
          Render a template to check its generated HTML.
        </Text>
      ) : findings.length === 0 ? (
        <Flex css={styles.lintEmpty}>
          <Text aria-hidden="true">✓</Text>
          <Text>No compatibility or accessibility issues detected.</Text>
        </Flex>
      ) : (
        <Stack as="ul" className="lint-findings" css={styles.lintList}>
          {findings.map((finding, index) => (
            <Box
              as="li"
              key={`${finding.ruleId}-${finding.line ?? 'document'}-${index}`}
              className="lint-finding"
              data-lint-rule={finding.ruleId}
              data-severity={finding.severity}
              css={styles.lintItem}
            >
              <Flex align="center" justify="space-between" gap="2" mb="2">
                <Badge
                  color={lintSeverityColor(finding.severity)}
                  bg={lintSeverityBackground(finding.severity)}
                  fontSize="2xs"
                  textTransform="uppercase"
                >
                  {finding.severity}
                </Badge>
                <Code
                  overflow="hidden"
                  color="preview.textMuted"
                  bg="transparent"
                  fontFamily="previewMono"
                  fontSize="2xs"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {finding.ruleId}
                </Code>
              </Flex>
              <Text color="preview.text" fontSize="xs" fontWeight="bold">
                {finding.message}
              </Text>
              <Text mt="1" color="preview.textMuted" fontSize="2xs">
                {finding.suggestion}
              </Text>
              {finding.compatibility ? (
                <Link
                  href={finding.compatibility.url}
                  target="_blank"
                  rel="noreferrer"
                  css={styles.lintReference}
                >
                  {finding.compatibility.feature} on{' '}
                  {finding.compatibility.source} ↗
                </Link>
              ) : null}
              {finding.line || finding.element ? (
                <Text
                  mt="2"
                  color="preview.textMuted"
                  fontFamily="previewMono"
                  fontSize="2xs"
                >
                  {[
                    finding.element,
                    finding.line ? `HTML line ${finding.line}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              ) : null}
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

function lintSeverityColor(severity: LintSeverity): string {
  if (severity === 'error') {
    return 'preview.danger';
  }

  if (severity === 'warning') {
    return 'preview.warning';
  }

  return 'preview.info';
}

function lintSeverityBackground(severity: LintSeverity): string {
  if (severity === 'error') {
    return 'preview.dangerSoft';
  }

  if (severity === 'warning') {
    return 'preview.warningSoft';
  }

  return 'preview.infoSoft';
}

function Viewer(props: PreviewWorkspaceProps) {
  const { state, securedHtml } = props;
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.viewer,
    previewViewerSlotRecipe,
  );
  const styles = recipe();
  const frameRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = frameRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height)
        props.onFrameSizeChange(
          Math.round(rect.width),
          Math.round(rect.height),
        );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [props, state.activeTab, state.frameRevision]);
  if (!state.result)
    return (
      <Stack className="empty-viewer" css={styles.empty}>
        {state.rendering || state.loadingTemplates ? (
          <Spinner size="xl" color="preview.accent" />
        ) : (
          <Grid aria-hidden="true" css={styles.emptyMark}>
            ce
          </Grid>
        )}
        <Text as="strong">
          {state.rendering
            ? 'Rendering email…'
            : state.loadingTemplates
              ? 'Discovering templates…'
              : 'Select an email to preview'}
        </Text>
        <Text fontSize="sm">
          The rendered email, source, and delivery-ready output will appear
          here.
        </Text>
      </Stack>
    );
  const result = state.result;
  const stats = messageStats(result.html);
  const variants = (
    <Flex align="center" gap="2" flexShrink="0">
      <chakra.label htmlFor="variant" fontSize="xs" color="preview.textMuted">
        Variant
      </chakra.label>
      <NativeSelect.Root size="sm" w="130px">
        <NativeSelect.Field
          id="variant"
          value={state.selectedVariant}
          onChange={(e) => props.onVariantChange(e.currentTarget.value)}
        >
          <option value="">Default</option>
          {state.result.variants.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Flex>
  );
  if (state.activeTab === 'preview' || state.activeTab === 'compare')
    return (
      <Box
        className="preview-surface"
        data-viewport={state.viewport}
        css={styles.surface}
      >
        <Stack css={styles.stage}>
          <Stack css={styles.inbox} gap="3">
            <Flex justify="space-between" align="center" gap="3">
              <Text
                fontSize="11px"
                letterSpacing="0.1em"
                textTransform="uppercase"
                color="preview.textMuted"
              >
                Inbox preview
              </Text>
              {variants}
            </Flex>
            <Flex
              gap="3"
              bg="preview.raised"
              borderWidth="1px"
              borderColor="preview.border"
              borderRadius="10px"
              p="3"
            >
              <Grid
                boxSize="8"
                flexShrink="0"
                placeItems="center"
                bg="preview.soft"
                borderRadius="full"
                fontWeight="semibold"
              >
                {shortTemplateName(state.result.name).charAt(0)}
              </Grid>
              <Stack gap="0.5" minW="0" flex="1" fontSize="xs">
                <Flex gap="2" justify="space-between">
                  <Text
                    truncate
                    fontWeight="semibold"
                    title={state.result.name}
                  >
                    {shortTemplateName(state.result.name)}
                  </Text>
                  <Text color="preview.textMuted" whiteSpace="nowrap">
                    9:41 AM
                  </Text>
                </Flex>
                <Text truncate title={state.result.subject}>
                  {state.result.subject}
                </Text>
                <Text
                  truncate
                  title={stats.previewText || 'No preview text'}
                  color={
                    stats.previewText ? 'preview.textMuted' : 'preview.warning'
                  }
                >
                  {stats.previewText || 'No preview text'}
                </Text>
              </Stack>
            </Flex>
          </Stack>
          {state.activeTab === 'compare' ? (
            <Flex
              className="compare-frames"
              flexWrap="wrap"
              gap="5"
              align="start"
              justify="center"
              w="full"
            >
              {(
                [
                  { viewport: 'desktop', width: 600, mode: 'light' },
                  { viewport: 'mobile', width: 375, mode: 'light' },
                  { viewport: 'mobile', width: 375, mode: 'dark' },
                ] as const
              ).map((frame) => (
                <Box as="figure" key={frame.viewport + frame.mode} m="0">
                  <Text
                    as="figcaption"
                    color="preview.textMuted"
                    fontFamily="previewMono"
                    fontSize="11px"
                    textAlign="center"
                    mb="3"
                  >
                    {frame.viewport === 'desktop' ? 'Desktop' : 'Mobile'} ·{' '}
                    {frame.mode === 'light' ? 'Light' : 'Dark'} · {frame.width}
                  </Text>
                  <Box
                    as="button"
                    aria-label={
                      'Open ' + frame.viewport + ' ' + frame.mode + ' preview'
                    }
                    display="block"
                    w={frame.width / 2 + 'px'}
                    h="421px"
                    overflow="hidden"
                    borderRadius="md"
                    onClick={() => {
                      props.onViewportChange(frame.viewport);
                      if (state.emailColorMode !== frame.mode)
                        props.onToggleEmailColorMode();
                      props.onTabChange('preview');
                    }}
                  >
                    <chakra.iframe
                      title={
                        result.name +
                        ' ' +
                        frame.viewport +
                        ' ' +
                        frame.mode +
                        ' preview'
                      }
                      sandbox=""
                      srcDoc={withPreviewContentSecurityPolicy(
                        withPreviewColorMode(result.html, frame.mode),
                        state.remoteImages,
                      )}
                      w={frame.width + 'px'}
                      h="842px"
                      transform="scale(0.5)"
                      transformOrigin="top left"
                      pointerEvents="none"
                      border="0"
                      bg={
                        frame.mode === 'dark'
                          ? 'preview.previewFrameDark'
                          : 'white'
                      }
                      style={{ colorScheme: 'only ' + frame.mode }}
                    />
                  </Box>
                </Box>
              ))}
            </Flex>
          ) : (
            <Stack gap="3" align="center" minW="min-content" w="full">
              <Text
                color="preview.textMuted"
                fontFamily="previewMono"
                fontSize="11px"
              >
                {state.frameWidth} px ·{' '}
                {state.emailColorMode === 'dark' ? 'Dark' : 'Light'} client
              </Text>
              <Box
                ref={frameRef}
                key={state.viewport + '-' + state.frameRevision}
                className="email-frame-shell"
                css={styles.frame}
                width={state.viewport === 'mobile' ? '375px' : '600px'}
                bg={
                  state.emailColorMode === 'dark'
                    ? 'preview.previewFrameDark'
                    : 'white'
                }
              >
                <chakra.iframe
                  id="email-preview-frame"
                  title={state.result.name + ' preview'}
                  srcDoc={securedHtml ?? undefined}
                  sandbox=""
                  data-email-color-mode={state.emailColorMode}
                  data-resolved-email-color-mode={state.emailColorMode}
                  w="full"
                  h="full"
                  border="0"
                  style={{ colorScheme: 'only ' + state.emailColorMode }}
                />
              </Box>
            </Stack>
          )}
        </Stack>
        {state.rendering ? <RenderOverlay label="Refreshing preview…" /> : null}
      </Box>
    );
  const output =
    state.activeTab === 'html'
      ? state.result.html
      : state.activeTab === 'text'
        ? state.result.text
        : state.result.source;
  return (
    <Grid
      className="code-view"
      data-language={state.activeTab}
      css={styles.codeRoot}
    >
      <Flex className="code-heading" css={styles.codeHeader}>
        <Text>
          {state.activeTab === 'text'
            ? 'text/plain'
            : state.activeTab === 'source'
              ? state.templates.find((t) => t.id === state.selectedId)?.path
              : state.result.name + '.html'}{' '}
          · {formatBytes(new TextEncoder().encode(output).length)}
        </Text>
        <Button
          size="xs"
          variant="ghost"
          data-action="copy-output"
          onClick={() => props.onCopy()}
        >
          {state.copied
            ? 'Copied'
            : 'Copy ' +
              (state.activeTab === 'text'
                ? 'text'
                : state.activeTab === 'source'
                  ? 'source'
                  : 'HTML')}
        </Button>
      </Flex>
      <Box as="pre" css={styles.code}>
        <code>
          {state.activeTab === 'html'
            ? output.split('\n').map((line, index) => (
                <Box as="span" display="block" key={index}>
                  <Box
                    as="span"
                    aria-hidden="true"
                    display="inline-block"
                    w="9"
                    mr="4"
                    color="preview.textMuted"
                    textAlign="right"
                    userSelect="none"
                  >
                    {index + 1}
                  </Box>
                  {line || ' '}
                </Box>
              ))
            : output}
        </code>
      </Box>
      {state.rendering ? <RenderOverlay label="Refreshing output…" /> : null}
    </Grid>
  );
}

function PreviewError({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry(): void;
  onDismiss(): void;
}) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.feedback,
    previewFeedbackSlotRecipe,
  );

  return (
    <Alert.Root
      className="error-banner"
      role="alert"
      status="error"
      css={recipe().error}
    >
      <Alert.Indicator color="preview.danger" />
      <Alert.Content>
        <Alert.Title>Preview interrupted</Alert.Title>
        <Alert.Description color="preview.textSubtle">
          {message}
        </Alert.Description>
      </Alert.Content>
      <Button
        type="button"
        data-action="retry"
        size="sm"
        color="preview.accentInk"
        bg="preview.accent"
        onClick={onRetry}
      >
        Try again
      </Button>
      <PreviewTooltip content="Dismiss this error message">
        <IconButton
          className="dismiss-button"
          type="button"
          data-action="dismiss-error"
          aria-label="Dismiss error"
          size="sm"
          color="preview.textSubtle"
          variant="ghost"
          onClick={onDismiss}
        >
          <ActionIcon name="close" />
        </IconButton>
      </PreviewTooltip>
    </Alert.Root>
  );
}

const PreviewIconButton = forwardRef<
  HTMLButtonElement,
  IconButtonProps & { 'aria-label': string }
>(function PreviewIconButton({ css, ...props }, ref) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.feedback,
    previewFeedbackSlotRecipe,
  );
  return <IconButton ref={ref} {...props} css={[css, recipe().iconButton]} />;
});

function PreviewTooltip({
  children,
  content,
  triggerId,
  disabled,
}: {
  children: ReactElement;
  content: string;
  triggerId?: string;
  disabled?: boolean;
}) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.feedback,
    previewFeedbackSlotRecipe,
  );

  return (
    <Tooltip.Root
      ids={{ trigger: triggerId }}
      disabled={disabled}
      openDelay={350}
      closeDelay={100}
    >
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content css={recipe().tooltip}>
            {content}
            <Tooltip.Arrow>
              <Tooltip.ArrowTip />
            </Tooltip.Arrow>
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Portal>
    </Tooltip.Root>
  );
}

function RenderOverlay({ label }: { label: string }) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.viewer,
    previewViewerSlotRecipe,
  );

  return (
    <Flex css={recipe().overlay}>
      <Spinner size="sm" color="preview.accent" />
      {label}
    </Flex>
  );
}

function ViewportIcon({ viewport }: { viewport: Viewport }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {viewport === 'mobile' ? (
        <rect x="7" y="2" width="10" height="20" rx="2" />
      ) : viewport === 'desktop' ? (
        <>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </>
      ) : (
        <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 12h10M7 12l3-3M7 12l3 3M17 12l-3-3M17 12l-3 3" />
      )}
    </svg>
  );
}

function ActionIcon({
  name,
}: {
  name:
    | 'copy'
    | 'download'
    | 'check'
    | 'reset'
    | 'sun'
    | 'moon'
    | 'close'
    | 'search';
}) {
  const paths = {
    search: 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    copy: 'M8 8h13v13H8zM16 8V3H3v13h5',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    check: 'm5 12 4 4L19 6',
    reset: 'M3 4v6h6M3 10a9 9 0 1 1 2 8',
    sun: 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
    moon: 'M20 15.5A9 9 0 0 1 8.5 4 9 9 0 1 0 20 15.5Z',
    close: 'm6 6 12 12M6 18 18 6',
  };
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}

// Discovery-generated names include directory breadcrumbs. The complete path
// remains available in the template row tooltip, without repeating it twice.
function shortTemplateName(name: string): string {
  return name.split(' / ').at(-1) ?? name;
}
