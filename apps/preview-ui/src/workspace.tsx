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
} from '@chakra-ui/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type {
  ApplicationState,
  EmailColorMode,
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
  tooltip: string;
}> = [
  { id: 'preview', label: 'Preview', tooltip: 'View the rendered email' },
  { id: 'html', label: 'HTML', tooltip: 'Inspect the rendered HTML output' },
  { id: 'text', label: 'Text', tooltip: 'Inspect the plain-text output' },
  { id: 'source', label: 'Source', tooltip: 'Inspect the template source' },
];

const viewports: ReadonlyArray<{
  id: Viewport;
  label: string;
  tooltip: string;
}> = [
  {
    id: 'desktop',
    label: 'Desktop',
    tooltip: 'Preview at a 680px desktop email width',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    tooltip: 'Preview at a 390px mobile email width',
  },
  {
    id: 'fluid',
    label: 'Fit',
    tooltip: 'Fit the email preview to the available workspace',
  },
];

const emailColorModes: ReadonlyArray<{
  id: EmailColorMode;
  label: string;
  tooltip: string;
}> = [
  {
    id: 'system',
    label: 'System',
    tooltip: 'Use your current system color preference in the email preview',
  },
  {
    id: 'light',
    label: 'Light',
    tooltip: 'Simulate a light color preference in the email preview',
  },
  {
    id: 'dark',
    label: 'Dark',
    tooltip: 'Simulate a dark color preference in the email preview',
  },
];

export type PreviewWorkspaceProps = {
  state: Readonly<ApplicationState>;
  securedHtml: string | null;
  theme?: Record<string, unknown>;
  onSelectTemplate(templateId: string): void;
  onTabChange(tab: PreviewTab): void;
  onViewportChange(viewport: Viewport): void;
  onToggleWorkspaceColorMode(): void;
  onEmailColorModeChange(colorMode: EmailColorMode): void;
  onRemoteImagesChange(checked: boolean): void;
  onVariantChange(variant: string): void;
  onPropsTextChange(value: string): void;
  onSendToChange(value: string): void;
  onSendSubjectChange(value: string): void;
  onApplyProps(): void;
  onCopy(): void;
  onDownload(): void;
  onSend(): void;
  onRetry(): void;
  onDismissError(): void;
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
  const [templatesOpen, setTemplatesOpen] = useState(
    () => window.innerWidth >= 768,
  );
  const [inspectorOpen, setInspectorOpen] = useState(
    () => window.innerWidth >= 960,
  );
  const templatesToggle = useRef<HTMLButtonElement>(null);
  const inspectorToggle = useRef<HTMLButtonElement>(null);
  const workspaceRecipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.workspace,
    previewWorkspaceSlotRecipe,
  );
  const styles = workspaceRecipe({ templatesOpen, inspectorOpen });
  const viewerRecipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.viewer,
    previewViewerSlotRecipe,
  );
  const viewerStyles = viewerRecipe();
  const remoteImagesInput = useRef<HTMLInputElement>(null);
  const selectedTemplate = state.templates.find(
    (template) => template.id === state.selectedId,
  );
  const outputLabel =
    state.activeTab === 'text'
      ? 'text'
      : state.activeTab === 'source'
        ? 'source'
        : 'HTML';
  const lint = state.result?.lint ?? [];
  const lintErrors = lint.filter(
    (finding) => finding.severity === 'error',
  ).length;
  const lintWarnings = lint.filter(
    (finding) => finding.severity === 'warning',
  ).length;

  useEffect(() => {
    const input = remoteImagesInput.current;

    if (!input) {
      return;
    }

    const handleChange = () => props.onRemoteImagesChange(input.checked);
    input.addEventListener('change', handleChange);

    return () => input.removeEventListener('change', handleChange);
  }, [props.onRemoteImagesChange]);

  return (
    <Grid
      className="preview-app"
      css={styles.root}
      data-templates-open={templatesOpen}
      data-inspector-open={inspectorOpen}
    >
      <Flex as="header" className="topbar" css={styles.header}>
        <Flex className="brand" css={styles.brand}>
          <Grid aria-hidden="true" css={styles.brandMark}>
            ce
          </Grid>
          <Stack css={styles.brandCopy}>
            <Text as="strong" fontSize="sm" letterSpacing="-0.01em">
              Chakra Email
            </Text>
          </Stack>
        </Flex>

        <Heading as="h1" css={styles.title} title={selectedTemplate?.path}>
          {shortTemplateName(
            state.result?.name ?? selectedTemplate?.name ?? 'Choose a template',
          )}
        </Heading>
        <Flex css={styles.headerActions}>
          <PreviewTooltip content="Show or hide email templates">
            <IconButton
              size="sm"
              variant="ghost"
              css={styles.modeToggle}
              data-action="toggle-templates"
              ref={templatesToggle}
              aria-label="Toggle templates"
              aria-expanded={templatesOpen}
              aria-controls="preview-templates"
              onClick={() => setTemplatesOpen((open) => !open)}
            >
              <PanelIcon side="left" />
            </IconButton>
          </PreviewTooltip>
          <PreviewTooltip content="Show or hide props and checks">
            <IconButton
              size="sm"
              variant="ghost"
              css={styles.modeToggle}
              data-action="toggle-inspector"
              ref={inspectorToggle}
              aria-label="Toggle preview settings"
              aria-expanded={inspectorOpen}
              aria-controls="preview-inspector"
              onClick={() => {
                setInspectorOpen((open) => !open);
                if (window.innerWidth < 768) setTemplatesOpen(false);
              }}
            >
              <PanelIcon side="right" />
            </IconButton>
          </PreviewTooltip>
          <PreviewTooltip
            content={`Switch the app to the ${
              state.workspaceColorMode === 'dark' ? 'light' : 'dark'
            } workspace theme`}
          >
            <IconButton
              className="workspace-color-mode-toggle"
              type="button"
              data-action="toggle-workspace-color-mode"
              aria-label={`Use ${
                state.workspaceColorMode === 'dark' ? 'light' : 'dark'
              } workspace theme`}
              size="sm"
              css={styles.modeToggle}
              variant="ghost"
              onClick={props.onToggleWorkspaceColorMode}
            >
              <Text aria-hidden="true">
                {state.workspaceColorMode === 'dark' ? '☀' : '☾'}
              </Text>
            </IconButton>
          </PreviewTooltip>

          <Badge
            className={`connection connection--${state.connection}`}
            role="status"
            css={styles.connection}
          >
            <Box
              aria-hidden="true"
              css={styles.connectionDot}
              bg={
                state.connection === 'connected'
                  ? 'preview.accent'
                  : 'preview.warning'
              }
              boxShadow={
                state.connection === 'connected'
                  ? '0 0 0 3px var(--chakra-colors-preview-accent-soft)'
                  : '0 0 0 3px var(--chakra-colors-preview-warning-soft)'
              }
            />
            {connectionLabel(state.connection)}
          </Badge>
        </Flex>
      </Flex>

      <Grid className="application-body" css={styles.body}>
        <Grid
          as="aside"
          className="sidebar"
          id="preview-templates"
          hidden={!templatesOpen}
          aria-label="Email templates"
          css={styles.sidebar}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              setTemplatesOpen(false);
              templatesToggle.current?.focus();
            }
          }}
        >
          <Flex css={styles.sidebarHeader}>
            <Text>Templates</Text>
            <Badge
              minW="6"
              justifyContent="center"
              borderRadius="lg"
              color="preview.textSubtle"
              bg="preview.soft"
              fontSize="2xs"
            >
              {state.templates.length}
            </Badge>
          </Flex>

          <Box as="nav" className="template-list" css={styles.templateNav}>
            <TemplateList
              {...props}
              onSelectTemplate={(id) => {
                props.onSelectTemplate(id);
                if (window.innerWidth < 768) setTemplatesOpen(false);
              }}
            />
          </Box>

          <Flex css={styles.sidebarFooter}>
            <Box
              aria-hidden="true"
              boxSize="1.5"
              borderRadius="full"
              bg="preview.accent"
            />
            Changes refresh automatically
          </Flex>
        </Grid>

        <Tabs.Root
          value={state.activeTab}
          id="preview-formats"
          activationMode="automatic"
          loopFocus
          onValueChange={(details) =>
            props.onTabChange(details.value as PreviewTab)
          }
          asChild
        >
          <Box as="main" className="workspace" css={styles.main}>
            <Flex className="workspace-heading" css={styles.heading}>
              <Tabs.List css={viewerStyles.tabs}>
                {tabs.map((tab) => (
                  <PreviewTooltip key={tab.id} content={tab.tooltip}>
                    <Tabs.Trigger
                      id={`tab-${tab.id}`}
                      value={tab.id}
                      data-tab={tab.id}
                      css={viewerStyles.tab}
                      onClick={() => props.onTabChange(tab.id)}
                      onKeyDown={(event) => {
                        const currentIndex = tabs.findIndex(
                          (candidate) => candidate.id === tab.id,
                        );
                        const nextIndex =
                          event.key === 'ArrowRight'
                            ? (currentIndex + 1) % tabs.length
                            : event.key === 'ArrowLeft'
                              ? (currentIndex - 1 + tabs.length) % tabs.length
                              : event.key === 'Home'
                                ? 0
                                : event.key === 'End'
                                  ? tabs.length - 1
                                  : null;

                        if (nextIndex === null) {
                          return;
                        }

                        const nextTab = tabs[nextIndex];

                        if (!nextTab) {
                          return;
                        }

                        event.preventDefault();
                        event.stopPropagation();
                        props.onTabChange(nextTab.id);
                        document
                          .querySelector<HTMLElement>(
                            `[data-tab="${nextTab.id}"]`,
                          )
                          ?.focus();
                      }}
                    >
                      {tab.label}
                    </Tabs.Trigger>
                  </PreviewTooltip>
                ))}
              </Tabs.List>

              <Flex className="workspace-actions" css={styles.actions}>
                <Flex
                  aria-label="Preview viewport"
                  css={styles.viewportControl}
                >
                  {viewports.map((viewport) => (
                    <PreviewTooltip
                      key={viewport.id}
                      content={viewport.tooltip}
                    >
                      <Button
                        type="button"
                        data-viewport={viewport.id}
                        aria-pressed={state.viewport === viewport.id}
                        disabled={state.activeTab !== 'preview'}
                        minH="8"
                        h="8"
                        px="2"
                        gap="1.5"
                        borderRadius="lg"
                        color={
                          state.viewport === viewport.id
                            ? 'preview.text'
                            : 'preview.textMuted'
                        }
                        bg={
                          state.viewport === viewport.id
                            ? 'preview.soft'
                            : 'transparent'
                        }
                        fontSize="2xs"
                        fontWeight="bold"
                        variant="ghost"
                        onClick={() => props.onViewportChange(viewport.id)}
                      >
                        <ViewportIcon viewport={viewport.id} />
                        {viewport.label}
                      </Button>
                    </PreviewTooltip>
                  ))}
                </Flex>

                <PreviewTooltip content="Allow the rendered email to load images from remote URLs">
                  <Switch.Root
                    checked={state.remoteImages}
                    disabled={state.activeTab !== 'preview'}
                    css={styles.remoteControl}
                  >
                    <Switch.HiddenInput
                      ref={remoteImagesInput}
                      id="remote-images"
                    />
                    <Switch.Control
                      bg="preview.borderStrong"
                      _checked={{ bg: 'preview.accentStrong' }}
                    >
                      <Switch.Thumb />
                    </Switch.Control>
                    <Switch.Label>Remote images</Switch.Label>
                  </Switch.Root>
                </PreviewTooltip>

                <Badge
                  className="lint-summary"
                  data-lint-count={lint.length}
                  css={styles.lintSummary}
                  borderColor={
                    lintErrors > 0
                      ? 'preview.dangerBorder'
                      : lintWarnings > 0
                        ? 'preview.warningBorder'
                        : 'preview.successBorder'
                  }
                  color={
                    lintErrors > 0
                      ? 'preview.danger'
                      : lintWarnings > 0
                        ? 'preview.warning'
                        : 'preview.accent'
                  }
                >
                  <Box aria-hidden="true">
                    {lintErrors > 0 ? '!' : lintWarnings > 0 ? '△' : '✓'}
                  </Box>
                  {!state.result
                    ? 'Checks'
                    : lint.length === 0
                      ? 'No issues'
                      : `${lint.length} ${lint.length === 1 ? 'issue' : 'issues'}`}
                </Badge>

                <PreviewTooltip content={`Download the ${outputLabel} output`}>
                  <Button
                    type="button"
                    data-action="download"
                    disabled={!state.result}
                    css={styles.secondaryAction}
                    onClick={props.onDownload}
                  >
                    <Box aria-hidden="true">↓</Box>
                    Download
                  </Button>
                </PreviewTooltip>

                <PreviewTooltip
                  content={`Copy the ${outputLabel} output to the clipboard`}
                >
                  <Button
                    className="copy-button"
                    type="button"
                    data-action="copy"
                    disabled={!state.result}
                    css={styles.primaryAction}
                    onClick={props.onCopy}
                  >
                    <Box aria-hidden="true">{state.copied ? '✓' : '⧉'}</Box>
                    {state.copied ? 'Copied' : `Copy ${outputLabel}`}
                  </Button>
                </PreviewTooltip>
              </Flex>
            </Flex>

            {state.error ? (
              <PreviewError
                message={state.error}
                onRetry={props.onRetry}
                onDismiss={props.onDismissError}
              />
            ) : null}

            <Grid className="workspace-content" css={styles.content}>
              <Box
                className="viewer-card"
                css={viewerStyles.root}
                display={inspectorOpen ? { base: 'none', md: 'grid' } : 'grid'}
              >
                {tabs.map((tab) => (
                  <Tabs.Content
                    key={tab.id}
                    value={tab.id}
                    css={viewerStyles.content}
                    tabIndex={0}
                  >
                    {state.activeTab === tab.id ? (
                      <Viewer
                        state={state}
                        securedHtml={props.securedHtml}
                        onEmailColorModeChange={props.onEmailColorModeChange}
                      />
                    ) : null}
                  </Tabs.Content>
                ))}
              </Box>

              <Box
                id="preview-inspector"
                hidden={!inspectorOpen}
                css={styles.inspectorPanel}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.stopPropagation();
                    setInspectorOpen(false);
                    inspectorToggle.current?.focus();
                  }
                }}
              >
                <Inspector {...props} />
              </Box>
            </Grid>
          </Box>
        </Tabs.Root>
      </Grid>
    </Grid>
  );
}

function TemplateList(props: PreviewWorkspaceProps) {
  const { state } = props;
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.templates,
    previewTemplatesSlotRecipe,
  );

  if (state.loadingTemplates && state.templates.length === 0) {
    return (
      <Stack aria-label="Loading templates" css={recipe().loading}>
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} h="14" borderRadius="xl" />
        ))}
      </Stack>
    );
  }

  if (state.templates.length === 0) {
    return (
      <Stack className="empty-sidebar" css={recipe().empty}>
        <Text aria-hidden="true" color="preview.accent" fontSize="2xl">
          ◇
        </Text>
        <Text as="strong" color="preview.text" fontSize="sm">
          No templates found
        </Text>
        <Text fontSize="xs">
          Add an email template matching your configured include pattern.
        </Text>
        <Button
          type="button"
          data-action="retry"
          mt="2"
          size="sm"
          color="preview.accent"
          borderColor="preview.borderStrong"
          variant="outline"
          onClick={props.onRetry}
        >
          Rescan templates
        </Button>
      </Stack>
    );
  }

  return (
    <Stack css={recipe().list}>
      {state.templates.map((template) => {
        const selected = template.id === state.selectedId;
        const styles = recipe({ selected });

        return (
          <Button
            key={template.id}
            type="button"
            className="template-item"
            data-template-id={template.id}
            title={template.path ?? template.name}
            aria-current={selected ? 'page' : undefined}
            css={styles.item}
            variant="ghost"
            onClick={() => props.onSelectTemplate(template.id)}
          >
            <Grid aria-hidden="true" css={styles.avatar}>
              <FileIcon />
            </Grid>
            <Stack css={styles.content}>
              <Text as="strong" css={styles.name}>
                {shortTemplateName(template.name)}
              </Text>
              <Text as="small" css={styles.path}>
                {template.path ?? template.id}
              </Text>
            </Stack>
          </Button>
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

  return (
    <Stack
      as="aside"
      className="inspector"
      aria-label="Preview settings"
      css={styles.root}
    >
      <Flex css={styles.header}>
        <Box>
          <Heading as="h2" fontSize="sm">
            Preview props
          </Heading>
        </Box>
        {state.propsDirty ? (
          <Badge className="unsaved" css={styles.dirty}>
            Edited
          </Badge>
        ) : null}
      </Flex>

      {state.result?.subject ? (
        <Text
          className="preview-subject"
          color="preview.textMuted"
          fontSize="xs"
        >
          Subject: {state.result.subject}
        </Text>
      ) : null}
      <Field.Root disabled={!state.result}>
        <Field.Label htmlFor="variant" css={styles.fieldLabel}>
          Variant
        </Field.Label>
        <NativeSelect.Root
          disabled={!state.result}
          size="sm"
          css={styles.control}
        >
          <NativeSelect.Field
            id="variant"
            value={state.selectedVariant}
            color="preview.text"
            bg="preview.raised"
            onChange={(event) =>
              props.onVariantChange(event.currentTarget.value)
            }
          >
            <option value="">Default</option>
            {(state.result?.variants ?? []).map((variant) => (
              <option key={variant} value={variant}>
                {variant}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator color="preview.textMuted" />
        </NativeSelect.Root>
      </Field.Root>

      <Field.Root invalid={Boolean(state.propsError)} disabled={!state.result}>
        <Flex w="full" align="center" justify="space-between">
          <Field.Label htmlFor="preview-props" css={styles.fieldLabel}>
            JSON props
          </Field.Label>
          <Text color="preview.textMuted" fontSize="2xs">
            Object only
          </Text>
        </Flex>
        <Textarea
          id="preview-props"
          value={state.propsText}
          css={styles.textarea}
          aria-describedby={`props-help${state.propsError ? ' props-error' : ''}`}
          aria-invalid={Boolean(state.propsError)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={!state.result}
          onInput={(event) =>
            props.onPropsTextChange(event.currentTarget.value)
          }
        />
        <Field.HelperText
          id="props-help"
          color="preview.textMuted"
          fontSize="2xs"
        >
          Applied locally to this preview. Your source file is not changed.
        </Field.HelperText>
        {state.propsError ? (
          <Field.ErrorText id="props-error" role="alert">
            {state.propsError}
          </Field.ErrorText>
        ) : null}
      </Field.Root>

      <Button
        className="apply-button"
        type="button"
        data-action="apply-props"
        disabled={!state.result || state.rendering}
        css={styles.primaryAction}
        onClick={props.onApplyProps}
      >
        {state.rendering ? (
          <>
            <Spinner size="xs" />
            Rendering
          </>
        ) : (
          'Apply props'
        )}
      </Button>

      {state.canTestSend ? (
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
                aria-describedby={
                  state.sendError ? 'test-send-error' : undefined
                }
                onInput={(event) =>
                  props.onSendToChange(event.currentTarget.value)
                }
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
            disabled={!state.result || state.sending}
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
            <Text
              role="status"
              color="preview.accent"
              css={styles.sendFeedback}
            >
              {state.sendMessage}
            </Text>
          ) : null}
        </Stack>
      ) : null}

      <LintPanel findings={state.result?.lint ?? null} />

      <Flex css={styles.notice}>
        <Text aria-hidden="true" color="preview.accent">
          ◈
        </Text>
        <Text>
          <Text as="strong" display="block" color="preview.textSubtle">
            Private by default
          </Text>
          Scripts and forms are disabled. Remote images stay blocked until
          enabled.
        </Text>
      </Flex>
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

  return 'preview.textSubtle';
}

function lintSeverityBackground(severity: LintSeverity): string {
  if (severity === 'error') {
    return 'preview.dangerSoft';
  }

  if (severity === 'warning') {
    return 'preview.warningSoft';
  }

  return 'preview.raised';
}

function Viewer({
  state,
  securedHtml,
  onEmailColorModeChange,
}: Pick<
  PreviewWorkspaceProps,
  'state' | 'securedHtml' | 'onEmailColorModeChange'
>) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.viewer,
    previewViewerSlotRecipe,
  );
  const styles = recipe();
  const [frameRevision, setFrameRevision] = useState(0);

  if (!state.result) {
    return (
      <Stack className="empty-viewer" css={styles.empty}>
        {state.rendering || state.loadingTemplates ? (
          <Spinner size="xl" color="preview.accent" />
        ) : (
          <Grid aria-hidden="true" css={styles.emptyMark}>
            ce
          </Grid>
        )}
        <Text as="strong" color="preview.text">
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
  }

  if (state.activeTab === 'preview') {
    const previewBackground =
      state.emailColorMode === 'dark'
        ? 'preview.previewDark'
        : state.emailColorMode === 'light'
          ? 'preview.previewLight'
          : 'preview.soft';
    const frameBackground =
      state.emailColorMode === 'dark'
        ? 'preview.previewFrameDark'
        : state.emailColorMode === 'light'
          ? 'white'
          : 'preview.panel';
    const iframeColorScheme =
      state.emailColorMode === 'system'
        ? 'light dark'
        : `only ${state.emailColorMode}`;

    return (
      <Box
        className="preview-surface"
        data-viewport={state.viewport}
        data-email-color-mode={state.emailColorMode}
        css={styles.surface}
        bg={previewBackground}
      >
        <Flex css={styles.stage}>
          <Box
            key={`${state.viewport}-${frameRevision}`}
            className="email-frame-shell"
            css={styles.frame}
            width={
              state.viewport === 'mobile'
                ? '390px'
                : state.viewport === 'desktop'
                  ? '680px'
                  : '100%'
            }
            bg={frameBackground}
          >
            <chakra.iframe
              id="email-preview-frame"
              title={`Rendered ${state.result.name} email`}
              srcDoc={securedHtml ?? undefined}
              sandbox=""
              data-email-color-mode={state.emailColorMode}
              w="full"
              h="full"
              border="0"
              bg={frameBackground}
              style={{ colorScheme: iframeColorScheme }}
            />
          </Box>
        </Flex>
        <Flex css={styles.surfaceHeader}>
          <Flex gap="2" align="center">
            <Text title="Drag the email frame’s bottom-right corner to resize it">
              {viewportLabel(state.viewport)} preset
            </Text>
            <Button
              size="xs"
              variant="ghost"
              css={styles.modeButton}
              data-action="reset-frame"
              onClick={() => setFrameRevision((value) => value + 1)}
              title="Restore preset dimensions after resizing"
            >
              Reset size
            </Button>
          </Flex>
          <Flex align="center" gap="3" wrap="wrap">
            <Flex
              role="group"
              aria-label="Email preview color mode"
              css={styles.modeGroup}
            >
              <Text px="1.5">Email</Text>
              {emailColorModes.map((colorMode) => (
                <PreviewTooltip key={colorMode.id} content={colorMode.tooltip}>
                  <Button
                    type="button"
                    data-email-color-mode={colorMode.id}
                    aria-pressed={state.emailColorMode === colorMode.id}
                    css={
                      recipe({
                        selected: state.emailColorMode === colorMode.id,
                      }).modeButton
                    }
                    variant="ghost"
                    onClick={() => onEmailColorModeChange(colorMode.id)}
                  >
                    {colorMode.label}
                  </Button>
                </PreviewTooltip>
              ))}
            </Flex>
            <Text>
              {state.remoteImages
                ? 'Remote images on'
                : 'Remote images blocked'}
            </Text>
          </Flex>
        </Flex>

        {state.rendering ? <RenderOverlay label="Refreshing preview…" /> : null}
      </Box>
    );
  }

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
            ? 'Plain text'
            : state.activeTab === 'source'
              ? 'Template source'
              : 'Rendered HTML'}
        </Text>
        <Text>{output.length.toLocaleString()} characters</Text>
      </Flex>
      <Box as="pre" css={styles.code}>
        <code>{output}</code>
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
          ×
        </IconButton>
      </PreviewTooltip>
    </Alert.Root>
  );
}

function PreviewTooltip({
  children,
  content,
}: {
  children: ReactElement;
  content: string;
}) {
  const recipe = usePreviewSlotRecipe(
    previewSlotRecipeKeys.feedback,
    previewFeedbackSlotRecipe,
  );

  return (
    <Tooltip.Root openDelay={350} closeDelay={100}>
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
    <Box
      aria-hidden="true"
      display="block"
      w={viewport === 'mobile' ? '6px' : viewport === 'fluid' ? '13px' : '12px'}
      h={viewport === 'mobile' ? '11px' : '9px'}
      borderWidth="1.5px"
      borderStyle="solid"
      borderInlineStyle={viewport === 'fluid' ? 'dashed' : 'solid'}
      borderColor="currentColor"
      borderRadius="2px"
    />
  );
}

function connectionLabel(connection: ApplicationState['connection']): string {
  if (connection === 'connected') {
    return 'Live';
  }

  if (connection === 'reconnecting') {
    return 'Reconnecting';
  }

  return 'Connecting';
}

function viewportLabel(viewport: Viewport): string {
  if (viewport === 'mobile') {
    return '390 px';
  }

  if (viewport === 'desktop') {
    return '680 px';
  }

  return 'Fit to window';
}

function PanelIcon({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d={side === 'left' ? 'M9 4v16' : 'M15 4v16'} />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8M8 16h6" />
    </svg>
  );
}

// Discovery-generated names include directory breadcrumbs. The complete path
// remains available on the template row and title, without repeating it twice.
function shortTemplateName(name: string): string {
  return name.split(' / ').at(-1) ?? name;
}
