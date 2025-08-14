import type { ClientInfo } from '@cloudflare/workers-oauth-provider';
import type { FC } from 'hono/jsx';
import { Button, Card, H2, InfoBox, InfoItem, Link, Text } from '../base';
import { ConnectionVisual } from './connection-visual';
import { Header } from './header';
import { Layout } from './layout';

interface ApprovalDialogProps {
  client: ClientInfo | null;
  encodedState: string;
  actionPath: string;
}

function sanitizeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getClientInfo(client: ClientInfo | null) {
  return {
    clientName: client?.clientName
      ? sanitizeHtml(client.clientName)
      : 'Unknown MCP Client',
    clientUri: client?.clientUri ? sanitizeHtml(client.clientUri) : '',
    policyUri: client?.policyUri ? sanitizeHtml(client.policyUri) : '',
    tosUri: client?.tosUri ? sanitizeHtml(client.tosUri) : '',
    contacts:
      client?.contacts && client.contacts.length > 0
        ? sanitizeHtml(client.contacts.join(', '))
        : '',
    redirectUris:
      client?.redirectUris && client.redirectUris.length > 0
        ? client.redirectUris.map((uri) => sanitizeHtml(uri))
        : [],
  };
}

export const ApprovalDialog: FC<ApprovalDialogProps> = ({
  client,
  encodedState,
  actionPath,
}) => {
  const { clientName, clientUri, policyUri, tosUri, contacts, redirectUris } =
    getClientInfo(client);

  return (
    <Layout title={`${clientName} is requesting access`}>
      <Card>
        <ConnectionVisual clientName={clientName} clientUri={clientUri} />

        <div className="mb-6">
          <H2 className="mb-2">
            <strong>{clientName}</strong> is requesting access
          </H2>

          <Text className="text-left text-sm">
            This MCP client is requesting to be authorized on the Axiom MCP
            Server. If you approve, you will be redirected to complete
            authentication with Axiom.
          </Text>
        </div>

        <InfoBox className="mb-6">
          {clientName && <InfoItem label="Client Name">{clientName}</InfoItem>}

          {clientUri && (
            <InfoItem label="Website">
              <Link href={clientUri} rel="noopener noreferrer" target="_blank">
                {clientUri}
              </Link>
            </InfoItem>
          )}

          {redirectUris.length > 0 && (
            <InfoItem label="Redirect URIs">
              {redirectUris.map((uri, index) => (
                <div key={index}>{uri}</div>
              ))}
            </InfoItem>
          )}

          {contacts && <InfoItem label="Contact">{contacts}</InfoItem>}

          {(policyUri || tosUri) && (
            <InfoItem className="mt-3" label="Legal">
              {policyUri && (
                <Link
                  href={policyUri}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Privacy Policy
                </Link>
              )}
              {policyUri && tosUri && ' • '}
              {tosUri && (
                <Link href={tosUri} rel="noopener noreferrer" target="_blank">
                  Terms of Service
                </Link>
              )}
            </InfoItem>
          )}
        </InfoBox>

        <form action={actionPath} className="m-0" method="post">
          <input name="state" type="hidden" value={encodedState} />
          <div className="flex gap-3">
            <Button
              fullWidth
              onclick="window.history.back()"
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button fullWidth type="submit">
              Approve
            </Button>
          </div>
        </form>
      </Card>
    </Layout>
  );
};
