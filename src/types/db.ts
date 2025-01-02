import { Prisma, User as _PrismaUser } from '@prisma/client';
import type { Action, Wallet as _PrismaWallet } from '@prisma/client';
import type { Conversation as _PrismaConversation } from '@prisma/client';
import { User as _PrivyUser } from '@privy-io/react-auth';

export type EmbeddedWallet = Pick<
  _PrismaWallet,
  'id' | 'ownerId' | 'name' | 'publicKey'
>;

export type ConversationMeta = Pick<
  _PrismaConversation,
  'id' | 'userId' | 'title'
>;

export type Conversation = _PrismaConversation;

export type PrivyUser = _PrivyUser;

export type PrismaUser = _PrismaUser & {
  wallets: EmbeddedWallet[];
};

export type NeurUser = Pick<
  PrismaUser,
  'id' | 'privyId' | 'createdAt' | 'updatedAt' | 'earlyAccess' | 'wallets'
> & {
  privyUser: PrivyUser;
  hasEAP: boolean;
};

export type NewAction = Omit<Action, 'id'>;

export type ActionWithUser = Prisma.ActionGetPayload<{
  include: {
    user: {
      include: {
        wallets: true;
      };
    };
  };
}>;

export type ActionFull = Prisma.ActionGetPayload<{
  select: { [K in keyof Required<Prisma.ActionSelect>]: true };
}>;
