import {
  Box,
  Button,
  Dialog,
  Flex,
  Input,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { ApplicationState, PreviewTab } from './app';
import type { PreviewWorkspaceProps } from './workspace';

type PaletteState = Pick<
  ApplicationState,
  | 'paletteOpen'
  | 'templates'
  | 'selectedId'
  | 'result'
  | 'activeTab'
  | 'viewport'
  | 'emailColorMode'
  | 'remoteImages'
  | 'templatesOpen'
  | 'inspectorOpen'
  | 'workspaceColorMode'
  | 'canTestSend'
  | 'sending'
  | 'canCheckLinks'
  | 'checkingLinks'
  | 'canOpenInEditor'
  | 'openingEditor'
  | 'rendering'
  | 'propsDirty'
  | 'propsError'
>;

export type PreviewPaletteProps = Pick<
  PreviewWorkspaceProps,
  | 'onSelectTemplate'
  | 'onTabChange'
  | 'onViewportChange'
  | 'onToggleEmailColorMode'
  | 'onRemoteImagesChange'
  | 'onPanelChange'
  | 'onPreferenceChange'
  | 'onCopy'
  | 'onDownload'
  | 'onOpenInEditor'
  | 'onCheckLinks'
> & {
  state: Readonly<PaletteState>;
  /** Capture the actual focused element before opening, including keyboard opens. */
  returnFocusRef: RefObject<HTMLElement | null>;
  /** Open the controlled Send test popover; called only after this modal exits. */
  onOpenSendTest(): void;
};

type Section = 'Templates' | 'View' | 'Preview' | 'Workspace' | 'Actions';
type Command = {
  id: string;
  label: string;
  section: Section;
  detail?: string;
  current?: boolean;
  disabled?: boolean;
  handoff?: boolean;
  run(): void;
};

const sections: Section[] = [
  'Templates',
  'View',
  'Preview',
  'Workspace',
  'Actions',
];
const views: Array<{ id: PreviewTab; label: string }> = [
  { id: 'preview', label: 'Preview' },
  { id: 'compare', label: 'Compare' },
  { id: 'html', label: 'HTML' },
  { id: 'text', label: 'Text' },
  { id: 'source', label: 'Source' },
];

/** The palette owns only presentation state; all workspace actions stay in the application. */
export function PreviewPalette(props: PreviewPaletteProps) {
  const { state } = props;
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [handoff, setHandoff] = useState(false);
  const queryRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pendingSend = useRef(false);
  const id = useId();
  const listId = id + '-commands';
  const hasCurrentRender = Boolean(
    state.result && state.result.id === state.selectedId,
  );
  const canSend = Boolean(
    state.canTestSend &&
    hasCurrentRender &&
    !state.rendering &&
    !state.sending &&
    !state.propsDirty &&
    !state.propsError,
  );
  const allCommands: Command[] = [
    ...[...state.templates]
      .sort(
        (left, right) =>
          (left.group ?? '').localeCompare(right.group ?? '') ||
          left.name.localeCompare(right.name) ||
          left.id.localeCompare(right.id),
      )
      .map((template) => ({
        id: 'template:' + template.id,
        section: 'Templates' as const,
        label: template.name,
        detail: [template.group, template.path].filter(Boolean).join(' · '),
        current: state.selectedId === template.id,
        run: () => props.onSelectTemplate(template.id),
      })),
    ...views.map((view) => ({
      id: 'view:' + view.id,
      section: 'View' as const,
      label: 'View: ' + view.label,
      current: state.activeTab === view.id,
      run: () => props.onTabChange(view.id),
    })),
    ...(['desktop', 'mobile'] as const).map((viewport) => ({
      id: 'viewport:' + viewport,
      section: 'Preview' as const,
      label: viewport === 'desktop' ? 'Desktop preview' : 'Mobile preview',
      detail: viewport === 'desktop' ? '600 px' : '375 px',
      current: state.viewport === viewport,
      run: () => props.onViewportChange(viewport),
    })),
    ...(['light', 'dark'] as const).map((mode) => ({
      id: 'email:' + mode,
      section: 'Preview' as const,
      label: mode === 'light' ? 'Light client' : 'Dark client',
      current: state.emailColorMode === mode,
      run: () => {
        if (state.emailColorMode !== mode) props.onToggleEmailColorMode();
      },
    })),
    ...([true, false] as const).map((enabled) => ({
      id: 'remote:' + String(enabled),
      section: 'Preview' as const,
      label: 'Remote images: ' + (enabled ? 'On' : 'Off'),
      current: state.remoteImages === enabled,
      run: () => props.onRemoteImagesChange(enabled),
    })),
    {
      id: 'sidebar',
      section: 'Workspace',
      label: 'Toggle sidebar',
      detail: state.templatesOpen ? 'Currently shown' : 'Currently hidden',
      run: () => props.onPanelChange('templatesOpen', !state.templatesOpen),
    },
    {
      id: 'inspector',
      section: 'Workspace',
      label: 'Toggle inspector',
      detail: state.inspectorOpen ? 'Currently shown' : 'Currently hidden',
      run: () => props.onPanelChange('inspectorOpen', !state.inspectorOpen),
    },
    ...(['system', 'light', 'dark'] as const).map((mode) => ({
      id: 'theme:' + mode,
      section: 'Workspace' as const,
      label: 'Interface theme: ' + mode[0].toUpperCase() + mode.slice(1),
      current: state.workspaceColorMode === mode,
      run: () => props.onPreferenceChange('workspaceColorMode', mode),
    })),
    ...(state.canTestSend
      ? [
          {
            id: 'send',
            section: 'Actions' as const,
            label: 'Send test',
            disabled: !canSend,
            handoff: true,
            run: props.onOpenSendTest,
          },
        ]
      : []),
    ...(state.canCheckLinks
      ? [
          {
            id: 'links',
            section: 'Actions' as const,
            label: 'Check links',
            disabled:
              !hasCurrentRender ||
              state.checkingLinks ||
              state.rendering ||
              state.propsDirty ||
              Boolean(state.propsError),
            run: props.onCheckLinks,
          },
        ]
      : []),
    {
      id: 'copy',
      section: 'Actions',
      label: 'Copy HTML',
      disabled: !hasCurrentRender,
      run: () => props.onCopy('html'),
    },
    {
      id: 'download',
      section: 'Actions',
      label: 'Download .eml',
      disabled: !hasCurrentRender,
      run: () => props.onDownload('eml'),
    },
    ...(state.canOpenInEditor
      ? [
          {
            id: 'editor',
            section: 'Actions' as const,
            label: 'Open in editor',
            disabled: !state.selectedId || state.openingEditor,
            run: props.onOpenInEditor,
          },
        ]
      : []),
  ];
  const commands = allCommands.filter((command) =>
    (command.label + ' ' + (command.detail ?? ''))
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const enabled = commands.filter((command) => !command.disabled);
  const active =
    enabled.find((command) => command.id === activeId) ?? enabled[0];
  const activeIndex = commands.findIndex(
    (command) => command.id === active?.id,
  );

  useEffect(() => {
    if (!state.paletteOpen) {
      setQuery('');
      setActiveId(null);
    } else {
      // A new open must never inherit a completed Send test focus handoff.
      pendingSend.current = false;
      setHandoff(false);
    }
  }, [state.paletteOpen]);
  useEffect(() => {
    if (state.paletteOpen && activeIndex >= 0)
      listRef.current
        ?.querySelector<HTMLElement>('[data-active-command="true"]')
        ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [state.paletteOpen, activeIndex, query]);

  const close = () => props.onPanelChange('paletteOpen', false);
  const run = (command: Command | undefined) => {
    if (!state.paletteOpen || !command || command.disabled) return;
    if (command.handoff) {
      pendingSend.current = true;
      setHandoff(true);
    }
    close();
    if (!command.handoff) command.run();
  };

  return (
    <Dialog.Root
      open={state.paletteOpen}
      onOpenChange={({ open }) => props.onPanelChange('paletteOpen', open)}
      initialFocusEl={() => queryRef.current}
      finalFocusEl={() => props.returnFocusRef.current}
      restoreFocus={!handoff}
      onExitComplete={() => {
        if (!pendingSend.current) return;
        pendingSend.current = false;
        if (canSend) props.onOpenSendTest();
        else props.returnFocusRef.current?.focus();
      }}
      lazyMount
      unmountOnExit
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content
            bg="preview.panel"
            color="preview.text"
            borderColor="preview.border"
            maxH="85dvh"
          >
            <Dialog.Header>
              <Flex align="center" justify="space-between" gap="3">
                <Dialog.Title>Command palette</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <Button
                    size="xs"
                    variant="ghost"
                    aria-label="Close command palette"
                  >
                    Close
                  </Button>
                </Dialog.CloseTrigger>
              </Flex>
            </Dialog.Header>
            <Dialog.Body pb="4" minH="0">
              <Input
                ref={queryRef}
                aria-label="Find a command"
                placeholder="Find a template or command…"
                role="combobox"
                aria-expanded={state.paletteOpen}
                aria-autocomplete="list"
                aria-controls={listId}
                aria-activedescendant={
                  activeIndex >= 0 ? id + '-command-' + activeIndex : undefined
                }
                value={query}
                onInput={(event) => {
                  setQuery(event.currentTarget.value);
                  setActiveId(null);
                }}
                onKeyDown={(event) => {
                  if (event.nativeEvent.isComposing) return;
                  if (
                    ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
                  ) {
                    event.preventDefault();
                    if (!enabled.length) return;
                    const index = enabled.findIndex(
                      (command) => command.id === active?.id,
                    );
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? enabled.length - 1
                          : (index +
                              (event.key === 'ArrowDown' ? 1 : -1) +
                              enabled.length) %
                            enabled.length;
                    setActiveId(enabled[next].id);
                  } else if (event.key === 'Enter') {
                    event.preventDefault();
                    run(active);
                  }
                }}
              />
              <Stack
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label="Commands"
                mt="3"
                maxH="50dvh"
                overflowY="auto"
                gap="3"
              >
                {sections.map((section) => {
                  const entries = commands.filter(
                    (command) => command.section === section,
                  );
                  if (!entries.length) return null;
                  const headingId = id + '-section-' + section;
                  return (
                    <Box key={section} role="group" aria-labelledby={headingId}>
                      <Text
                        id={headingId}
                        fontSize="xs"
                        fontWeight="semibold"
                        color="preview.textMuted"
                        px="3"
                        py="1"
                      >
                        {section}
                      </Text>
                      {entries.map((command) => {
                        const index = commands.indexOf(command);
                        return (
                          <Flex
                            key={command.id}
                            id={id + '-command-' + index}
                            role="option"
                            aria-label={
                              command.label +
                              (command.detail ? ', ' + command.detail : '')
                            }
                            aria-selected={active?.id === command.id}
                            aria-disabled={command.disabled || undefined}
                            data-active-command={active?.id === command.id}
                            data-current={command.current || undefined}
                            align="center"
                            justify="space-between"
                            gap="3"
                            px="3"
                            py="2"
                            borderRadius="md"
                            bg={
                              active?.id === command.id
                                ? 'preview.soft'
                                : 'transparent'
                            }
                            color={
                              command.disabled
                                ? 'preview.textMuted'
                                : 'preview.text'
                            }
                            cursor={
                              command.disabled ? 'not-allowed' : 'pointer'
                            }
                            onMouseDown={(event) => event.preventDefault()}
                            onPointerMove={() => {
                              if (!command.disabled) setActiveId(command.id);
                            }}
                            onClick={() => run(command)}
                          >
                            <Stack gap="0" minW="0">
                              <Text fontSize="sm">{command.label}</Text>
                              {command.detail ? (
                                <Text
                                  fontSize="xs"
                                  color="preview.textMuted"
                                  truncate
                                >
                                  {command.detail}
                                </Text>
                              ) : null}
                            </Stack>
                            {command.current ? (
                              <Text fontSize="xs" color="preview.textMuted">
                                Current
                              </Text>
                            ) : null}
                          </Flex>
                        );
                      })}
                    </Box>
                  );
                })}
              </Stack>
              {!commands.length ? (
                <Text role="status" p="3" color="preview.textMuted">
                  No matching commands
                </Text>
              ) : null}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
