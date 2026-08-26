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
import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import type {
  ApplicationState,
  EmailColorMode,
  LintFinding,
  LintSeverity,
  PreviewTab,
  Viewport,
} from './app';
import { previewSystem } from './theme';

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

const avatarColors = ['#91d8c5', '#e6bf83', '#93bfe6', '#c8a6df'];

export type PreviewWorkspaceProps = {
  state: Readonly<ApplicationState>;
  securedHtml: string | null;
  onSelectTemplate(templateId: string): void;
  onTabChange(tab: PreviewTab): void;
  onViewportChange(viewport: Viewport): void;
  onToggleWorkspaceColorMode(): void;
  onEmailColorModeChange(colorMode: EmailColorMode): void;
  onRemoteImagesChange(checked: boolean): void;
  onVariantChange(variant: string): void;
  onPropsTextChange(value: string): void;
  onApplyProps(): void;
  onCopy(): void;
  onRetry(): void;
  onDismissError(): void;
};

export function PreviewRoot(props: PreviewWorkspaceProps) {
  return (
    <ChakraProvider value={previewSystem}>
      <PreviewWorkspace {...props} />
    </ChakraProvider>
  );
}

function PreviewWorkspace(props: PreviewWorkspaceProps) {
  const { state } = props;
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
      h="100vh"
      gridTemplateRows="68px minmax(0, 1fr)"
      color="preview.text"
      bg="preview.canvas"
      backgroundImage="radial-gradient(circle at 85% -20%, rgba(73, 154, 137, 0.12), transparent 35%)"
      _light={{
        backgroundImage:
          'radial-gradient(circle at 85% -20%, rgba(22, 134, 108, 0.1), transparent 35%)',
      }}
    >
      <Flex
        as="header"
        className="topbar"
        zIndex="docked"
        align="center"
        justify="space-between"
        px="5"
        borderBottomWidth="1px"
        borderColor="preview.border"
        bg="preview.chrome"
        backdropFilter="blur(18px)"
      >
        <Flex className="brand" gap="3" align="center">
          <Grid
            aria-hidden="true"
            boxSize="9"
            placeItems="center"
            borderWidth="1px"
            borderColor="rgba(99, 217, 187, 0.28)"
            borderRadius="xl"
            color="#0d1a17"
            bg="preview.accent"
            boxShadow="0 8px 28px rgba(53, 185, 151, 0.2)"
            fontSize="sm"
            fontWeight="extrabold"
            letterSpacing="-0.05em"
          >
            ce
          </Grid>
          <Stack gap="0">
            <Text as="strong" fontSize="sm" letterSpacing="-0.01em">
              Chakra Email
            </Text>
            <Text as="small" color="preview.textMuted" fontSize="xs">
              Preview workspace
            </Text>
          </Stack>
        </Flex>

        <Flex align="center" gap="2">
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
              borderWidth="1px"
              borderColor="preview.border"
              borderRadius="full"
              color="preview.textSubtle"
              bg="preview.overlay"
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
            display="flex"
            alignItems="center"
            gap="2"
            minW="92px"
            px="3"
            py="2"
            borderWidth="1px"
            borderColor="preview.border"
            borderRadius="full"
            color="preview.textSubtle"
            bg="preview.overlay"
            fontSize="2xs"
            fontWeight="bold"
            letterSpacing="0.03em"
            textTransform="uppercase"
          >
            <Box
              aria-hidden="true"
              boxSize="2"
              borderRadius="full"
              bg={
                state.connection === 'connected'
                  ? 'preview.accent'
                  : 'preview.warning'
              }
              boxShadow={
                state.connection === 'connected'
                  ? '0 0 0 3px rgba(99, 217, 187, 0.12)'
                  : '0 0 0 3px rgba(244, 189, 108, 0.12)'
              }
            />
            {connectionLabel(state.connection)}
          </Badge>
        </Flex>
      </Flex>

      <Grid
        className="application-body"
        minH="0"
        gridTemplateColumns="264px minmax(0, 1fr)"
      >
        <Grid
          as="aside"
          className="sidebar"
          aria-label="Email templates"
          minH="0"
          gridTemplateRows="auto minmax(0, 1fr) auto"
          borderRightWidth="1px"
          borderColor="preview.border"
          bg="preview.sidebar"
        >
          <Flex
            align="center"
            justify="space-between"
            px="4"
            pt="6"
            pb="3"
            color="preview.textSubtle"
            fontSize="2xs"
            fontWeight="extrabold"
            letterSpacing="0.09em"
            textTransform="uppercase"
          >
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

          <Box
            as="nav"
            className="template-list"
            minH="0"
            px="2.5"
            pb="4"
            overflowY="auto"
            css={{
              scrollbarColor: 'var(--chakra-colors-preview-border) transparent',
              scrollbarWidth: 'thin',
            }}
          >
            <TemplateList {...props} />
          </Box>

          <Flex
            gap="2"
            align="center"
            px="4"
            py="4"
            borderTopWidth="1px"
            borderColor="preview.border"
            color="preview.textMuted"
            fontSize="2xs"
          >
            <Box
              aria-hidden="true"
              boxSize="1.5"
              borderRadius="full"
              bg="preview.accent"
            />
            Changes refresh automatically
          </Flex>
        </Grid>

        <Box as="main" className="workspace" minW="0" minH="0" p="5">
          <Flex
            className="workspace-heading"
            minW="0"
            align="center"
            justify="space-between"
            gap="5"
            mb="4"
          >
            <Box minW="0">
              <Text
                mb="1"
                color="preview.accent"
                fontSize="2xs"
                fontWeight="extrabold"
                letterSpacing="0.1em"
                textTransform="uppercase"
              >
                Email preview
              </Text>
              <Heading
                as="h1"
                overflow="hidden"
                color="preview.text"
                fontSize="xl"
                fontWeight="bold"
                letterSpacing="-0.035em"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {state.result?.name ??
                  selectedTemplate?.name ??
                  'Choose a template'}
              </Heading>
              {selectedTemplate?.path ? (
                <Code
                  display="block"
                  maxW="500px"
                  mt="1"
                  overflow="hidden"
                  color="preview.textMuted"
                  bg="transparent"
                  fontFamily="previewMono"
                  fontSize="2xs"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {selectedTemplate.path}
                </Code>
              ) : null}
            </Box>

            <Flex className="workspace-actions" align="center" gap="2">
              <Flex
                aria-label="Preview viewport"
                p="1"
                borderWidth="1px"
                borderColor="preview.border"
                borderRadius="xl"
                bg="preview.panel"
              >
                {viewports.map((viewport) => (
                  <PreviewTooltip key={viewport.id} content={viewport.tooltip}>
                    <Button
                      type="button"
                      data-viewport={viewport.id}
                      aria-pressed={state.viewport === viewport.id}
                      disabled={state.activeTab !== 'preview'}
                      minH="8"
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
                  display="flex"
                  minH="10"
                  alignItems="center"
                  gap="2"
                  px="2.5"
                  borderWidth="1px"
                  borderColor="preview.border"
                  borderRadius="xl"
                  color="preview.textSubtle"
                  bg="preview.panel"
                  fontSize="2xs"
                  fontWeight="bold"
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
                display="flex"
                minH="10"
                alignItems="center"
                gap="1.5"
                px="3"
                borderWidth="1px"
                borderColor={
                  lintErrors > 0
                    ? 'rgba(255, 129, 120, 0.3)'
                    : lintWarnings > 0
                      ? 'rgba(244, 189, 108, 0.3)'
                      : 'rgba(99, 217, 187, 0.25)'
                }
                borderRadius="xl"
                color={
                  lintErrors > 0
                    ? 'preview.danger'
                    : lintWarnings > 0
                      ? 'preview.warning'
                      : 'preview.accent'
                }
                bg="preview.panel"
                fontSize="2xs"
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

              <PreviewTooltip
                content={`Copy the ${outputLabel} output to the clipboard`}
              >
                <Button
                  className="copy-button"
                  type="button"
                  data-action="copy"
                  disabled={!state.result}
                  minH="10"
                  px="3"
                  gap="2"
                  borderWidth="1px"
                  borderColor="rgba(99, 217, 187, 0.25)"
                  borderRadius="xl"
                  color="preview.accentInk"
                  bg="preview.accent"
                  boxShadow="previewAccent"
                  fontSize="xs"
                  fontWeight="extrabold"
                  _hover={{
                    bg: 'preview.accentHover',
                    transform: 'translateY(-1px)',
                  }}
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

          <Grid
            className="workspace-content"
            minH="calc(100vh - 166px)"
            gridTemplateColumns="minmax(500px, 1fr) 286px"
            gap="4"
          >
            <Tabs.Root
              className="viewer-card"
              id="preview-formats"
              value={state.activeTab}
              activationMode="automatic"
              loopFocus
              minW="0"
              minH="610px"
              display="grid"
              gridTemplateRows="48px minmax(0, 1fr)"
              overflow="hidden"
              borderWidth="1px"
              borderColor="preview.border"
              borderRadius="2xl"
              bg="preview.panelTranslucent"
              boxShadow="previewPanel"
              onValueChange={(details) =>
                props.onTabChange(details.value as PreviewTab)
              }
            >
              <Tabs.List
                alignItems="end"
                gap="1"
                px="2"
                pt="2"
                borderBottomWidth="1px"
                borderColor="preview.border"
              >
                {tabs.map((tab) => (
                  <PreviewTooltip key={tab.id} content={tab.tooltip}>
                    <Tabs.Trigger
                      id={`tab-${tab.id}`}
                      value={tab.id}
                      data-tab={tab.id}
                      h="10"
                      px="3"
                      color="preview.textMuted"
                      fontSize="xs"
                      fontWeight="bold"
                      _selected={{
                        color: 'preview.text',
                        _after: {
                          position: 'absolute',
                          insetInline: '3',
                          bottom: '-1px',
                          h: '2px',
                          borderRadius: 'full',
                          bg: 'preview.accent',
                          content: '""',
                        },
                      }}
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

              {tabs.map((tab) => (
                <Tabs.Content
                  key={tab.id}
                  value={tab.id}
                  minH="0"
                  h="full"
                  p="0"
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
            </Tabs.Root>

            <Inspector {...props} />
          </Grid>
        </Box>
      </Grid>
    </Grid>
  );
}

function TemplateList(props: PreviewWorkspaceProps) {
  const { state } = props;

  if (state.loadingTemplates && state.templates.length === 0) {
    return (
      <Stack aria-label="Loading templates" gap="2" py="2">
        {[0, 1, 2].map((item) => (
          <Skeleton key={item} h="14" borderRadius="xl" />
        ))}
      </Stack>
    );
  }

  if (state.templates.length === 0) {
    return (
      <Stack
        className="empty-sidebar"
        align="center"
        gap="2"
        py="8"
        px="3"
        color="preview.textMuted"
        textAlign="center"
      >
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
    <Stack gap="0.5">
      {state.templates.map((template, index) => {
        const selected = template.id === state.selectedId;
        const initials = template.name
          .split(/\s+/)
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return (
          <Button
            key={template.id}
            type="button"
            className="template-item"
            data-template-id={template.id}
            aria-current={selected ? 'page' : undefined}
            display="grid"
            gridTemplateColumns="36px minmax(0, 1fr) auto"
            gap="3"
            alignItems="center"
            w="full"
            minH="14"
            px="2"
            py="2"
            borderWidth="1px"
            borderColor={selected ? 'rgba(99, 217, 187, 0.2)' : 'transparent'}
            borderRadius="xl"
            color={selected ? 'preview.text' : 'preview.textSubtle'}
            bg={selected ? 'preview.accentSoft' : 'transparent'}
            textAlign="start"
            variant="ghost"
            _hover={{ color: 'preview.text', bg: 'preview.hover' }}
            onClick={() => props.onSelectTemplate(template.id)}
          >
            <Grid
              aria-hidden="true"
              boxSize="9"
              placeItems="center"
              borderWidth="1px"
              borderColor="rgba(255, 255, 255, 0.07)"
              borderRadius="lg"
              color="#17221f"
              bg={avatarColors[index % avatarColors.length]}
              fontSize="2xs"
              fontWeight="black"
              letterSpacing="0.03em"
            >
              {initials}
            </Grid>
            <Stack minW="0" gap="0.5">
              <Text
                as="strong"
                overflow="hidden"
                color="inherit"
                fontSize="xs"
                fontWeight="bold"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {template.name}
              </Text>
              <Text
                as="small"
                overflow="hidden"
                color="preview.textMuted"
                fontFamily="previewMono"
                fontSize="2xs"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {template.path ?? template.id}
              </Text>
            </Stack>
            <Text
              aria-hidden="true"
              color={selected ? 'preview.accent' : 'preview.textMuted'}
              fontSize="xl"
            >
              ›
            </Text>
          </Button>
        );
      })}
    </Stack>
  );
}

function Inspector(props: PreviewWorkspaceProps) {
  const { state } = props;

  return (
    <Stack
      as="aside"
      className="inspector"
      aria-label="Preview settings"
      minW="0"
      gap="4"
      p="4"
      borderWidth="1px"
      borderColor="preview.border"
      borderRadius="2xl"
      bg="preview.panelTranslucent"
      boxShadow="previewPanel"
      maxH="calc(100vh - 166px)"
      overflowY="auto"
    >
      <Flex align="start" justify="space-between">
        <Box>
          <Text
            mb="1"
            color="preview.accent"
            fontSize="2xs"
            fontWeight="extrabold"
            letterSpacing="0.1em"
            textTransform="uppercase"
          >
            Template data
          </Text>
          <Heading as="h2" fontSize="md">
            Preview props
          </Heading>
        </Box>
        {state.propsDirty ? (
          <Badge
            className="unsaved"
            color="preview.warning"
            bg="preview.warningSoft"
          >
            Edited
          </Badge>
        ) : null}
      </Flex>

      <Field.Root disabled={!state.result}>
        <Field.Label htmlFor="variant" color="preview.textSubtle" fontSize="xs">
          Variant
        </Field.Label>
        <NativeSelect.Root
          disabled={!state.result}
          size="sm"
          borderColor="preview.borderStrong"
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
          <Field.Label
            htmlFor="preview-props"
            color="preview.textSubtle"
            fontSize="xs"
          >
            JSON props
          </Field.Label>
          <Text color="preview.textMuted" fontSize="2xs">
            Object only
          </Text>
        </Flex>
        <Textarea
          id="preview-props"
          value={state.propsText}
          minH="210px"
          resize="vertical"
          borderColor="preview.borderStrong"
          color="preview.text"
          bg="preview.raised"
          fontFamily="previewMono"
          fontSize="xs"
          aria-describedby={`props-help${state.propsError ? ' props-error' : ''}`}
          aria-invalid={Boolean(state.propsError)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={!state.result}
          _focusVisible={{
            borderColor: 'preview.accent',
            boxShadow: '0 0 0 1px var(--chakra-colors-preview-accent)',
          }}
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
        minH="10"
        color="preview.accentInk"
        bg="preview.accent"
        boxShadow="previewAccent"
        fontSize="xs"
        fontWeight="extrabold"
        _hover={{ bg: 'preview.accentHover', transform: 'translateY(-1px)' }}
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

      <LintPanel findings={state.result?.lint ?? null} />

      <Flex
        gap="2"
        p="3"
        borderWidth="1px"
        borderColor="preview.border"
        borderRadius="xl"
        color="preview.textMuted"
        bg="preview.soft"
        fontSize="2xs"
      >
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
  const errors =
    findings?.filter((finding) => finding.severity === 'error').length ?? 0;
  const warnings =
    findings?.filter((finding) => finding.severity === 'warning').length ?? 0;

  return (
    <Stack
      className="lint-panel"
      gap="3"
      pt="4"
      borderTopWidth="1px"
      borderColor="preview.border"
    >
      <Flex align="start" justify="space-between" gap="3">
        <Box>
          <Text
            mb="1"
            color="preview.accent"
            fontSize="2xs"
            fontWeight="extrabold"
            letterSpacing="0.1em"
            textTransform="uppercase"
          >
            Email lint
          </Text>
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
        <Flex
          gap="2"
          p="3"
          borderWidth="1px"
          borderColor="rgba(99, 217, 187, 0.2)"
          borderRadius="xl"
          color="preview.accent"
          bg="preview.accentSoft"
          fontSize="xs"
        >
          <Text aria-hidden="true">✓</Text>
          <Text>No compatibility or accessibility issues detected.</Text>
        </Flex>
      ) : (
        <Stack
          as="ul"
          className="lint-findings"
          gap="2"
          m="0"
          p="0"
          listStyleType="none"
        >
          {findings.map((finding, index) => (
            <Box
              as="li"
              key={`${finding.ruleId}-${finding.line ?? 'document'}-${index}`}
              className="lint-finding"
              data-lint-rule={finding.ruleId}
              data-severity={finding.severity}
              p="3"
              borderWidth="1px"
              borderColor="preview.border"
              borderRadius="xl"
              bg="preview.soft"
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
  if (!state.result) {
    return (
      <Stack
        className="empty-viewer"
        h="full"
        minH="500px"
        align="center"
        justify="center"
        gap="3"
        color="preview.textMuted"
        textAlign="center"
      >
        {state.rendering || state.loadingTemplates ? (
          <Spinner size="xl" color="preview.accent" />
        ) : (
          <Grid
            aria-hidden="true"
            boxSize="16"
            placeItems="center"
            borderRadius="2xl"
            color="preview.accentInk"
            bg="preview.accent"
            fontWeight="black"
          >
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
        ? '#080c0f'
        : state.emailColorMode === 'light'
          ? '#e8eeec'
          : 'preview.soft';
    const frameBackground =
      state.emailColorMode === 'dark'
        ? '#111827'
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
        position="relative"
        h="full"
        minH="560px"
        p="4"
        bg={previewBackground}
        overflow="auto"
      >
        <Flex
          align="center"
          justify="space-between"
          gap="3"
          wrap="wrap"
          mb="3"
          color="preview.textMuted"
          fontSize="2xs"
          fontWeight="bold"
          textTransform="uppercase"
        >
          <Text>{viewportLabel(state.viewport)}</Text>
          <Flex align="center" gap="3" wrap="wrap">
            <Flex
              role="group"
              aria-label="Email preview color mode"
              align="center"
              gap="1"
              p="1"
              borderWidth="1px"
              borderColor="preview.border"
              borderRadius="lg"
              bg="preview.panel"
            >
              <Text px="1.5">Email mode</Text>
              {emailColorModes.map((colorMode) => (
                <PreviewTooltip key={colorMode.id} content={colorMode.tooltip}>
                  <Button
                    type="button"
                    data-email-color-mode={colorMode.id}
                    aria-pressed={state.emailColorMode === colorMode.id}
                    minH="7"
                    px="2"
                    borderRadius="md"
                    color={
                      state.emailColorMode === colorMode.id
                        ? 'preview.accentInk'
                        : 'preview.textMuted'
                    }
                    bg={
                      state.emailColorMode === colorMode.id
                        ? 'preview.accent'
                        : 'transparent'
                    }
                    fontSize="2xs"
                    fontWeight="extrabold"
                    textTransform="none"
                    variant="ghost"
                    _hover={{
                      color:
                        state.emailColorMode === colorMode.id
                          ? 'preview.accentInk'
                          : 'preview.text',
                      bg:
                        state.emailColorMode === colorMode.id
                          ? 'preview.accentHover'
                          : 'preview.hover',
                    }}
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
        <Box
          className="email-frame-shell"
          w="full"
          maxW={
            state.viewport === 'mobile'
              ? '390px'
              : state.viewport === 'desktop'
                ? '680px'
                : 'full'
          }
          h="calc(100% - 30px)"
          minH="500px"
          mx="auto"
          overflow="hidden"
          borderRadius="lg"
          bg={frameBackground}
          boxShadow="0 12px 44px rgba(0, 0, 0, 0.34)"
          transition="max-width 180ms ease"
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
      position="relative"
      h="full"
      minH="560px"
      gridTemplateRows="42px minmax(0, 1fr)"
      bg="#0a0e10"
    >
      <Flex
        className="code-heading"
        align="center"
        justify="space-between"
        px="4"
        borderBottomWidth="1px"
        borderColor="preview.border"
        color="preview.textMuted"
        fontSize="2xs"
        fontWeight="bold"
      >
        <Text>
          {state.activeTab === 'text'
            ? 'Plain text'
            : state.activeTab === 'source'
              ? 'Template source'
              : 'Rendered HTML'}
        </Text>
        <Text>{output.length.toLocaleString()} characters</Text>
      </Flex>
      <Box
        as="pre"
        m="0"
        p="5"
        overflow="auto"
        color="preview.textSubtle"
        fontFamily="previewMono"
        fontSize="xs"
        lineHeight="1.7"
        whiteSpace="pre-wrap"
      >
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
  return (
    <Alert.Root
      className="error-banner"
      role="alert"
      status="error"
      mb="4"
      borderWidth="1px"
      borderColor="rgba(255, 129, 120, 0.25)"
      borderRadius="xl"
      color="preview.text"
      bg="preview.dangerSoft"
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
  return (
    <Tooltip.Root openDelay={350} closeDelay={100}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Portal>
        <Tooltip.Positioner>
          <Tooltip.Content
            maxW="260px"
            px="2.5"
            py="1.5"
            borderWidth="1px"
            borderColor="preview.borderStrong"
            borderRadius="md"
            color="preview.text"
            bg="preview.raised"
            boxShadow="lg"
            fontSize="2xs"
            lineHeight="1.4"
          >
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
  return (
    <Flex
      position="absolute"
      inset="0"
      align="center"
      justify="center"
      gap="2"
      color="preview.text"
      bg="rgba(10, 14, 16, 0.72)"
      backdropFilter="blur(2px)"
      fontSize="sm"
      fontWeight="bold"
    >
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
