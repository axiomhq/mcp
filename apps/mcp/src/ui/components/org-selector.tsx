import type { FC } from 'hono/jsx';
import { Button, Card, FormGroup, H2, Select, Text } from '../base';
import { ConnectionVisual } from './connection-visual';
import { Layout } from './layout';

interface OrgSelectorProps {
  orgs: Array<{ id: string; name: string }>;
  encodedState: string;
  clientName?: string;
  clientUri?: string;
}

export const OrgSelector: FC<OrgSelectorProps> = ({ orgs, encodedState, clientName = 'MCP Client', clientUri = '' }) => {
  return (
    <Layout title="Select Organization | Axiom MCP">
      <Card>
        <ConnectionVisual clientUri={clientUri} clientName={clientName} />

        <div className="mb-6">
          <H2>Select Organization</H2>
          <Text>
            Choose which Axiom organization you want to grant access to. This
            will allow the MCP client to query data and interact with resources
            in the selected organization.
          </Text>
        </div>

        <form action="/org-callback" method="post" className="m-0 p-0">
          <input name="state" type="hidden" value={encodedState} />

          <FormGroup htmlFor="orgId">
            <Select autofocus id="orgId" name="orgId" required>
              <option
                className="text-sm text-gray-500 dark:text-gray-400"
                disabled
                selected
                value=""
              >
                Choose an organization...
              </option>
              {orgs.map((org) => (
                <option
                  className="text-sm text-gray-900 dark:text-gray-100"
                  key={org.id}
                  value={org.id}
                >
                  {org.name} ({org.id})
                </option>
              ))}
            </Select>
          </FormGroup>

          <Button fullWidth type="submit">
            Connect to Organization
          </Button>
        </form>
      </Card>
    </Layout>
  );
};
