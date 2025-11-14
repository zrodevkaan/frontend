import {
  createEffect,
  createSignal,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";

import { Handler } from "mdast-util-to-hast";
import { cva } from "styled-system/css";
import { Plugin } from "unified";
import { visit } from "unist-util-visit";

import { useClient } from "@revolt/client";
import {
  Avatar,
  Column,
  MenuButton,
  OverflowingText,
  Row,
  Tooltip,
  typography,
  Username,
  UserStatus,
} from "@revolt/ui";

import { useLingui } from "@lingui-solid/solid";
import { floatingUserMenus } from "@revolt/app/menus/UserContextMenu";
import { User } from "stoat.js";
import { styled } from "styled-system/jsx";
import { CustomEmoji, Emoji, RE_CUSTOM_EMOJI } from "../emoji";
import { TextWithEmoji } from "../emoji/TextWithEmoji";
import { userInformation } from "../users";

const RenderAvatarOnEmoji = styled("div", {
  base: {
    position: "absolute",
  },
});

const NameStatusStack = styled("div", {
  base: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
});

function Member(props: { user?: User; member?: ServerMember }) {
  const { t } = useLingui();

  /**
   * Create user information
   */
  const user = () =>
    userInformation((props.user ?? props.member?.user)!, props.member);

  /**
   * Get user status
   */
  const status = () =>
    (props.user ?? props.member?.user)?.statusMessage((s) =>
      s === "Online"
        ? t`Online`
        : s === "Busy"
          ? t`Busy`
          : s === "Focus"
            ? t`Focus`
            : s === "Idle"
              ? t`Idle`
              : t`Offline`,
    );

  return (
    <div
      use:floating={floatingUserMenus(
        (props.user ?? props.member?.user)!,
        props.member,
      )}
    >
      <MenuButton
        size="normal"
        attention={
          (props.user ?? props.member?.user)?.online ? "active" : "muted"
        }
        icon={
          <Avatar
            src={user().avatar}
            size={32}
            holepunch="bottom-right"
            overlay={
              <UserStatus.Graphic
                status={(props.user ?? props.member?.user)?.presence}
              />
            }
          />
        }
      >
        <NameStatusStack>
          <OverflowingText>
            <Username username={user().username} colour={user().colour!} />
          </OverflowingText>
          <Show when={status()}>
            <Tooltip
              content={() => <TextWithEmoji content={status()!} />}
              placement="top-start"
              aria={status()!}
            >
              <OverflowingText class={typography({ class: "_status" })}>
                <TextWithEmoji content={status()!} />
              </OverflowingText>
            </Tooltip>
          </Show>
        </NameStatusStack>
      </MenuButton>
    </div>
  );
}

/**
 * Render a custom emoji
 *
 * This will also display a tooltip and fallback to text if the emoji doesn't exist.
 */
export function RenderCustomEmoji(props: { id: string }) {
  const [exists, setExists] = createSignal(true);
  const [user, setUser] = createSignal<User>();

  const client = useClient();

  /**
   * Resolve emoji
   */
  const emoji = () => client()!.emojis.get(props.id);

  createEffect(() => {
    (async () => {
      const fetchedUser = await client().users.fetch(
        String(emoji()?.creator?.id),
      );
      console.log(fetchedUser);
      setUser(fetchedUser);
    })();
  });

  /**
   * Resolve server
   */
  const server = () =>
    client()!.servers.get(
      (emoji()!.parent as { type: "Server"; id: string }).id,
    )!;

  return (
    <Switch fallback={<span>{`:${emoji()?.name ?? props.id}:`}</span>}>
      <Match when={exists()}>
        <div
          class={tooltipTrigger()}
          use:floating={{
            tooltip: {
              placement: "top",
              content: () => (
                <Row align gap="lg">
                  <span style={{ "--emoji-size": "3em" }}>
                    <Emoji emoji={props.id} />
                  </span>
                  <Switch
                    fallback={
                      <>
                        Unknown emote
                        <FetchEmote id={props.id} />
                      </>
                    }
                  >
                    <Match when={emoji()?.parent.type === "Server"}>
                      <Column align>
                        <span>{`:${emoji()!.name}:`}</span>
                        <Switch fallback="Private Server">
                          <Match when={server()}>
                            <Row align>
                              <Avatar
                                size={14}
                                src={server().animatedIconURL}
                              />
                              {server().name}
                            </Row>
                          </Match>
                        </Switch>
                      </Column>
                    </Match>
                  </Switch>
                  <Member user={user()} />
                </Row>
              ),
              aria:
                emoji()?.parent.type === "Server"
                  ? `:${emoji()!.name}: from ${
                      server()?.name ?? "Private Server"
                    }`
                  : "Unknown emote",
            },
          }}
        >
          <CustomEmoji id={props.id} onError={() => setExists(false)} />
        </div>
      </Match>
    </Switch>
  );
}

/**
 * Container for trigger
 */
const tooltipTrigger = cva({
  base: {
    display: "inline-block",
  },
});

/**
 * Helper to fetch unknown emotes
 */
function FetchEmote(props: { id: string }) {
  const client = useClient();
  onMount(() => client().emojis.fetch(props.id));
  return null;
}

export const remarkCustomEmoji: Plugin = () => (tree) => {
  visit(
    tree,
    "text",
    (
      node: { type: "text"; value: string },
      idx,
      parent: { children: unknown[] },
    ) => {
      const elements = node.value.split(RE_CUSTOM_EMOJI);
      if (elements.length === 1) return; // no matches

      // Generate initial node
      const newNodes: (
        | { type: "text"; value: string }
        | {
            type: "customEmoji";
            id: string;
          }
      )[] = [
        {
          type: "text",
          value: elements.shift()!,
        },
      ];

      // Process all timestamps
      for (let i = 0; i < elements.length / 2; i++) {
        // Insert components
        newNodes.push({
          type: "customEmoji",
          id: elements[i * 2],
        });

        newNodes.push({
          type: "text",
          value: elements[i * 2 + 1],
        });
      }

      parent.children.splice(idx, 1, ...newNodes);
      return idx + newNodes.length;
    },
  );
};

export const customEmojiHandler: Handler = (h, node) => {
  return {
    type: "element" as const,
    tagName: "customEmoji",
    children: [],
    properties: {
      id: node.id,
    },
  };
};
