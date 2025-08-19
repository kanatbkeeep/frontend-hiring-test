import React from "react";
import { ItemContent, Virtuoso } from "react-virtuoso";
import cn from "clsx";
import { useQuery } from "@apollo/client";
import {
  MessageSender,
  MessageStatus,
  type Message,
} from "../__generated__/resolvers-types";
import css from "./chat.module.css";
import { GET_MESSAGES } from "./graphql/queries";

const Item: React.FC<Message> = ({ text, sender }) => {
  return (
    <div className={css.item}>
      <div
        className={cn(
          css.message,
          sender === MessageSender.Admin ? css.out : css.in
        )}
      >
        {text}
      </div>
    </div>
  );
};

const getItem: ItemContent<Message, unknown> = (_, data) => {
  return <Item {...data} />;
};

export const Chat: React.FC = () => {
  const { data, loading, error } = useQuery(GET_MESSAGES, {
    variables: {
      first: 20,
    },
  });

  const messages: Message[] = data?.messages?.edges?.map(edge => edge.node) || [];

  if (loading) return <div>Loading messages...</div>;
  if (error) return <div>Error loading messages: {error.message}</div>;

  return (
    <div className={css.root}>
      <div className={css.container}>
        <Virtuoso className={css.list} data={messages} itemContent={getItem} />
      </div>
      <div className={css.footer}>
        <input
          type="text"
          className={css.textInput}
          placeholder="Message text"
        />
        <button>Send</button>
      </div>
    </div>
  );
};
