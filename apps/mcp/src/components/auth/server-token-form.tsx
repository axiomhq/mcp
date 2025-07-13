import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ServerTokenFormProps {
  actionPath: string;
  encodedState: string;
  error?: string;
  validationErrors?: {
    token?: string;
    permissions?: string;
  };
}

export function ServerTokenForm({
  actionPath,
  encodedState,
  error,
  validationErrors,
}: ServerTokenFormProps) {
  return (
    <form action={actionPath} class="space-y-4" method="post">
      <input name="state" type="hidden" value={encodedState} />

      <div class="space-y-2">
        <Label htmlFor="apiToken">Axiom API Token</Label>
        <Input
          aria-describedby="token-help token-error"
          aria-invalid={!!validationErrors?.token}
          class="font-mono"
          id="apiToken"
          name="apiToken"
          pattern="xaat-.*"
          placeholder="xaat-..."
          required
          type="password"
        />
        {validationErrors?.token && (
          <p class="text-destructive text-sm" id="token-error">
            {validationErrors.token}
          </p>
        )}
        <p class="text-muted-foreground text-sm" id="token-help">
          Enter your Axiom API token. You can create one in your{' '}
          <a
            class="text-primary hover:underline"
            href="https://app.axiom.co/settings/api-tokens"
            rel="noopener noreferrer"
            target="_blank"
          >
            Axiom settings
          </a>
          .
        </p>
      </div>

      {/* General error display */}
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Validation Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Permission-specific errors */}
      {validationErrors?.permissions && (
        <Alert>
          <AlertTitle>Missing Permissions</AlertTitle>
          <AlertDescription>{validationErrors.permissions}</AlertDescription>
        </Alert>
      )}

      <div class="flex justify-end gap-3">
        <Button onclick="window.history.back()" type="button" variant="outline">
          Cancel
        </Button>
        <Button name="action" type="submit" value="authorize">
          Authorize
        </Button>
      </div>
    </form>
  );
}
