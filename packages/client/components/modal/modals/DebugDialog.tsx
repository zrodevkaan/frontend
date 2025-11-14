import { RenderCodeblock } from "@revolt/markdown/plugins/Codeblock";
import { Dialog, Header, Text } from "@revolt/ui";
import { Message } from "stoat.js";
import { Flex } from "styled-system/jsx";

export default function DebugDialog(props) {
  const message: Message = props.message;

  const debugInfo = {
    id: message.id,
    channelId: message.channelId,
    authorId: message.authorId,
    content: message.content,
    createdAt: message.createdAt?.toISOString(),
    editedAt: message.editedAt?.toISOString(),
    nonce: message.nonce,
    pinned: message.pinned,
    flags: message.flags,
    mentioned: message.mentioned,

    webhook: message.webhook
      ? {
          id: message.webhook.id,
          name: message.webhook.name,
          avatarURL: message.webhook.avatarURL,
        }
      : undefined,

    username: message.username,
    roleColour: message.roleColour,
    avatarURL: message.avatarURL,

    mentionIds: message.mentionIds,
    roleMentionIds: message.roleMentionIds,

    replyIds: message.replyIds,

    attachments: message.attachments?.map((a) => ({
      id: a._id,
      filename: a.filename,
      size: a.size,
      contentType: a.contentType,
    })),

    embeds: message.embeds,

    reactions: message.reactions
      ? Array.from(message.reactions.entries()).map(([emoji, users]) => ({
          emoji,
          users: Array.from(users),
        }))
      : undefined,

    systemMessage: message.systemMessage,

    masquerade: message.masquerade,

    interactions: message.interactions,

    server: message.server
      ? {
          id: message.server.id,
          name: message.server.name,
        }
      : undefined,

    channel: message.channel
      ? {
          id: message.channel.id,
          name: message.channel.name,
        }
      : undefined,

    path: message.path,
    url: message.url,
  };

  const codeToDisplay = JSON.stringify(debugInfo, null, 2);

  // {RenderCodeblock(<div>{`\`\`\`json\n${codeToDisplay}\n\`\`\``}</div>)}

  return (
    <Dialog {...props}>
      <Header placement="secondary">
        Message Debug Info
        {message.server?.name && ` - ${message.server.name}`}
      </Header>

      <Flex direction="column" gap="4" p="4" maxH="70vh" overflowY="auto">
        <Flex direction="column" gap="2">
          <Text size="lg" weight="bold">
            Overview
          </Text>
          <Text size="sm" colour="muted">
            ID: {message.id}
          </Text>
          <Text size="sm" colour="muted">
            Created: {message.createdAt?.toLocaleString()}
          </Text>
          <Text size="sm" colour="muted">
            Author: {message.username} ({message.authorId})
          </Text>
        </Flex>

        <Flex direction="column" gap="2">
          <Text size="lg" weight="bold">
            Raw Data
          </Text>
          <RenderCodeblock>{codeToDisplay}</RenderCodeblock>
        </Flex>
      </Flex>
    </Dialog>
  );
}
