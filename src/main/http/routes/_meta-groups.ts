/**
 * Capability groups an agent navigates by. Deliberately decoupled from the
 * routes files: files are organised for whoever maintains them, groups are
 * organised for whoever is looking for a capability, and those two rarely
 * agree. Internal code names never appear here.
 *
 * `notHere` is what makes a wrong guess cheap — it redirects on the spot
 * instead of leaving the agent to conclude Halo cannot do the thing.
 */

import type { GroupId, GroupMeta } from './_meta-types'

export const GROUPS: Record<GroupId, GroupMeta> = {
  conversation: {
    title: 'conversation — talk to Halo, drive and inspect chat sessions',
    covers:
      'start a new Halo turn, stop or cancel whatever Halo is currently doing, see what is still running, list and read conversations and the reasoning behind a message, rename, star and delete them, see which toolsets a conversation has open',
    notHere: {
      'chatting with a digital human': 'digital-human',
      'files produced during a conversation': 'workspace',
      'which model this conversation uses': 'settings',
      'inbound messages from IM platforms': 'channels',
      'sending a notification out to the user': 'tool:notify_channel',
    },
    withheld: [
      'Answer a pending question on the user\'s behalf — Halo stopped to ask precisely because it needed a person, so the user answers it in the conversation.',
      'Open or close a toolset. Reading which are open is fine; flipping one is the user\'s, and the request_toolset tool is how you ask them to.',
    ],
    noEndpoint: {
      'exporting a conversation to a file':
        'There is no export endpoint. Read it with GET /api/spaces/:spaceId/conversations/:conversationId and write the file yourself.',
    },
  },
  workspace: {
    title: 'workspace — spaces and the files they hold',
    covers:
      'create, rename, reorder and delete spaces, space settings and working directory, browse and read produced files and artifacts',
    notHere: {
      'documents indexed for retrieval': 'knowledge-base',
      'digital humans living in a space': 'digital-human',
      'stopping a running task': 'conversation',
      'running shell commands in the working directory': 'terminal',
    },
  },
  'digital-human': {
    title: 'digital-human — create, run and configure digital humans',
    covers:
      'install and uninstall, pause and resume, manual trigger, schedule and user config, list its chat threads, chat with it in any of them and read the transcript, export its definition as YAML, run history and activity',
    notHere: {
      'binding a digital human to an IM chat': 'channels',
      'files a digital human produced': 'workspace',
      'installing from the app store': 'store',
      'knowledge a digital human reads': 'knowledge-base',
    },
  },
  'knowledge-base': {
    title: 'knowledge-base — document collections agents can search',
    covers:
      'create and delete collections, bind them to a space, import and remove documents, resolve read paths back to their source documents, indexing progress and status',
    notHere: {
      'ordinary files in a space': 'workspace',
      'digital humans that read a collection': 'digital-human',
    },
  },
  channels: {
    title: 'channels — inbound IM channels and outbound notifications',
    covers:
      'connect and disconnect IM channels, bind a chat to a digital human, list every thread a digital human has (IM and its own), read a bound chat transcript, configure and test outbound notification channels, drop cached channel tokens',
    notHere: {
      'the digital human on the other end of a channel': 'digital-human',
      'model providers and API keys': 'settings',
    },
    withheld: [
      'Pair a brand-new WeCom bot or WeChat personal account (QR-code pairing) — none of that flow is open to you. The user does the whole thing in Settings > Message Channels on the desktop app.',
      'Create a channel instance, or set up a notification channel (SMTP for email, a webhook URL, a bot key) — the user does this in Settings > Message Channels. The only write path behind it replaces the whole configuration in one call, so a partial write would drop their other channels.',
    ],
  },
  settings: {
    title: 'settings — how this build is configured and what it can do',
    covers:
      'application version, sign-in and model providers this build offers, model capability presets, switching model source and model, deleting a model source, the security policy in force, agent engine capabilities and availability, MCP server diagnostics',
    notHere: {
      'per-space settings': 'workspace',
      'per-digital-human config': 'digital-human',
      'notification channel setup, IM accounts, bot binding': 'channels',
      'sending a notification': 'tool:notify_channel',
      'stopping something Halo is doing': 'conversation',
      'installing or updating store items': 'store',
      'knowledge collection settings': 'knowledge-base',
      'where a space keeps its files': 'workspace',
    },
    withheld: [
      'Add a model source, or change an API key — both need the key in plaintext, so the user does it in Settings > AI Model rather than sending a secret into this conversation.',
      'Change remote-access settings (port, token, tunnel) — the user does this in Settings > Remote Access, on the desktop app only; it is not in the remote web UI.',
    ],
    noEndpoint: {
      'updating Halo itself':
        'Halo updates itself; there is no upgrade endpoint. /api/store/updates covers installed store items, not the app. Tell the user Halo updates on its own.',
    },
  },
  store: {
    title: 'store — browse and install from the app store',
    covers:
      'browse and search store listings, read a listing, install and uninstall store items, install from a local .dhpkg file, skills',
    notHere: {
      'configuring an installed digital human': 'digital-human',
      'knowledge collections': 'knowledge-base',
      'installing or removing a skill': 'tool:skill_manage',
    },
  },
  terminal: {
    title: 'terminal — interactive shell sessions',
    covers: 'create a session, write input, read output, close a session',
    notHere: {
      'reading files without a shell': 'workspace',
    },
    noEndpoint: {
      'running a command for yourself':
        'Use your own Bash tool. This API drives the terminal the user watches and types into; it is for handing a session to them, not for getting work done.',
    },
  },
}
