import React, { useState } from "react";
import { ItemContent, Virtuoso } from "react-virtuoso";
import cn from "clsx";
import { useQuery, useMutation, useSubscription } from "@apollo/client";
import {
  MessageSender,
  MessageStatus,
  type Message,
} from "../__generated__/resolvers-types";
import css from "./chat.module.css";
import { GET_MESSAGES, MESSAGE_ADDED_SUBSCRIPTION, MESSAGE_UPDATED_SUBSCRIPTION } from "./graphql/queries";
import { SEND_MESSAGE } from "./graphql/mutations";

const Item: React.FC<Message> = ({ text, sender, status }) => {
  const getStatusIcon = () => {
    switch (status) {
      case MessageStatus.Sending:
        return "⏳";
      case MessageStatus.Sent:
        return "✓";
      case MessageStatus.Read:
        return "✓✓";
      default:
        return "";
    }
  };

  return (
    <div className={css.item}>
      <div
        className={cn(
          css.message,
          sender === MessageSender.Admin ? css.out : css.in
        )}
      >
        {text}
        {sender === MessageSender.Admin && (
          <span style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.7 }}>
            {getStatusIcon()}
          </span>
        )}
      </div>
    </div>
  );
};

const getItem: ItemContent<Message, unknown> = (_, data) => {
  return <Item {...data} />;
};

export const Chat: React.FC = () => {
  const [messageText, setMessageText] = useState("");

  const { data, loading, error, fetchMore } = useQuery(GET_MESSAGES, {
    variables: {
      first: 20,
    },
  });

  const [sendMessage, { loading: sendingMessage }] = useMutation(SEND_MESSAGE, {
    update(cache, { data: mutationData }) {
      if (mutationData?.sendMessage) {
        const existingData = cache.readQuery({
          query: GET_MESSAGES,
          variables: { first: 20 },
        }) as any;

        if (existingData && existingData.messages) {
          const existingMessage = existingData.messages.edges.find(
            (edge: any) => edge.node.id === mutationData.sendMessage.id
          );

          if (existingMessage) {
            const existingUpdatedAt = new Date(existingMessage.node.updatedAt);
            const newUpdatedAt = new Date(mutationData.sendMessage.updatedAt);
            
            if (newUpdatedAt < existingUpdatedAt) {
              return;
            }
          }

          if (!existingMessage) {
            cache.writeQuery({
              query: GET_MESSAGES,
              variables: { first: 20 },
              data: {
                messages: {
                  ...existingData.messages,
                  edges: [
                    ...existingData.messages.edges,
                    {
                      node: mutationData.sendMessage,
                      cursor: mutationData.sendMessage.id,
                      __typename: "MessageEdge",
                    },
                  ],
                },
              },
            });
          } else {
            cache.writeQuery({
              query: GET_MESSAGES,
              variables: { first: 20 },
              data: {
                messages: {
                  ...existingData.messages,
                  edges: existingData.messages.edges.map((edge: any) =>
                    edge.node.id === mutationData.sendMessage.id
                      ? {
                          ...edge,
                          node: mutationData.sendMessage,
                        }
                      : edge
                  ),
                },
              },
            });
          }
        }
      }
    },
  });

  useSubscription(MESSAGE_ADDED_SUBSCRIPTION, {
    onData: ({ data: subscriptionData, client }) => {
      if (subscriptionData.data?.messageAdded) {
        const newMessage = subscriptionData.data.messageAdded;
        const existingData = client.readQuery({
          query: GET_MESSAGES,
          variables: { first: 20 },
        }) as any;

        if (existingData && existingData.messages) {
          const existingMessage = existingData.messages.edges.find(
            (edge: any) => edge.node.id === newMessage.id
          );

          if (!existingMessage) {
            client.writeQuery({
              query: GET_MESSAGES,
              variables: { first: 20 },
              data: {
                messages: {
                  ...existingData.messages,
                  edges: [
                    ...existingData.messages.edges,
                    {
                      node: newMessage,
                      cursor: newMessage.id,
                      __typename: "MessageEdge",
                    },
                  ],
                },
              },
            });
          }
        }
      }
    },
  });

  useSubscription(MESSAGE_UPDATED_SUBSCRIPTION, {
    onData: ({ data: subscriptionData, client }) => {
      if (subscriptionData.data?.messageUpdated) {
        const updatedMessage = subscriptionData.data.messageUpdated;
        const existingData = client.readQuery({
          query: GET_MESSAGES,
          variables: { first: 20 },
        }) as any;

        if (existingData && existingData.messages) {
          const existingMessage = existingData.messages.edges.find(
            (edge: any) => edge.node.id === updatedMessage.id
          );

          if (existingMessage) {
            const existingUpdatedAt = new Date(existingMessage.node.updatedAt);
            const newUpdatedAt = new Date(updatedMessage.updatedAt);
            
            if (newUpdatedAt >= existingUpdatedAt) {
              client.writeQuery({
                query: GET_MESSAGES,
                variables: { first: 20 },
                data: {
                  messages: {
                    ...existingData.messages,
                    edges: existingData.messages.edges.map((edge: any) =>
                      edge.node.id === updatedMessage.id
                        ? {
                            ...edge,
                            node: updatedMessage,
                          }
                        : edge
                    ),
                  },
                },
              });
            }
          }
        }
      }
    },
  });

  const messages: Message[] = data?.messages?.edges?.map((edge: any) => edge.node) || [];
  const hasNextPage = data?.messages?.pageInfo?.hasNextPage || false;
  const endCursor = data?.messages?.pageInfo?.endCursor;

  const loadMore = () => {
    if (hasNextPage && endCursor) {
      fetchMore({
        variables: {
          first: 20,
          after: endCursor,
        },
        updateQuery: (prevResult, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prevResult;

          return {
            messages: {
              ...fetchMoreResult.messages,
              edges: [
                ...prevResult.messages.edges,
                ...fetchMoreResult.messages.edges,
              ],
            },
          };
        },
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (messageText.trim() && !sendingMessage) {
      try {
        await sendMessage({
          variables: {
            text: messageText.trim(),
          },
        });
        setMessageText("");
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  if (loading) return <div>Loading messages...</div>;
  if (error) return <div>Error loading messages: {error.message}</div>;

  return (
    <div className={css.root}>
      <div className={css.container}>
        {hasNextPage && (
          <div style={{ padding: '10px', textAlign: 'center' }}>
            <button onClick={loadMore}>Load More Messages</button>
          </div>
        )}
        <Virtuoso className={css.list} data={messages} itemContent={getItem} />
      </div>
      <form className={css.footer} onSubmit={handleSendMessage}>
        <input
          type="text"
          className={css.textInput}
          placeholder="Message text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          disabled={sendingMessage}
        />
        <button type="submit" disabled={sendingMessage || !messageText.trim()}>
          {sendingMessage ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
};
