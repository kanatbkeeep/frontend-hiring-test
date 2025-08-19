import { gql } from '@apollo/client';

export const GET_MESSAGES = gql`
  query GetMessages($first: Int, $after: MessagesCursor) {
    messages(first: $first, after: $after) {
      edges {
        node {
          id
          text
          status
          updatedAt
          sender
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded {
    messageAdded {
      id
      text
      status
      updatedAt
      sender
    }
  }
`;

export const MESSAGE_UPDATED_SUBSCRIPTION = gql`
  subscription MessageUpdated {
    messageUpdated {
      id
      text
      status
      updatedAt
      sender
    }
  }
`;