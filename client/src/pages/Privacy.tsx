import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                VibeBot ("we", "our", or "us") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard
                your information when you use our self-hosted AI agent application.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold mb-2 mt-4">Account Information</h3>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Email address</li>
                <li>Name (optional)</li>
                <li>Password (stored as a secure hash)</li>
                <li>Account creation and last login timestamps</li>
              </ul>

              <h3 className="text-xl font-semibold mb-2 mt-4">API Keys</h3>
              <p className="text-muted-foreground">
                We store your encrypted API keys for Claude and OpenAI services. These keys
                are encrypted at rest and are only decrypted when necessary to make API
                calls on your behalf. We never log or share your API keys with third
                parties.
              </p>

              <h3 className="text-xl font-semibold mb-2 mt-4">Usage Data</h3>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Conversation history and messages</li>
                <li>AI model usage and preferences</li>
                <li>Login attempts and authentication events</li>
                <li>API usage metrics for cost tracking</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground">We use your information to:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Provide and maintain the VibeBot service</li>
                <li>Authenticate and authorize your access</li>
                <li>Store your conversation history</li>
                <li>Make AI API calls using your credentials</li>
                <li>Track your API usage and costs</li>
                <li>Improve and optimize the application</li>
                <li>Prevent unauthorized access and abuse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. Data Storage and Security</h2>
              <p className="text-muted-foreground">
                Your data is stored in a PostgreSQL database on your self-hosted instance.
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Password hashing using bcrypt</li>
                <li>JWT-based authentication with HTTP-only cookies</li>
                <li>Encrypted API key storage</li>
                <li>Rate limiting to prevent brute force attacks</li>
                <li>Account lockout after failed login attempts</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Third-Party Services</h2>
              <p className="text-muted-foreground">
                VibeBot integrates with third-party AI services (Claude AI and OpenAI).
                When you use these services through VibeBot:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>
                  Your prompts and conversations are sent to the respective AI provider
                </li>
                <li>
                  These providers have their own privacy policies and terms of service
                </li>
                <li>We do not control how these providers handle your data</li>
                <li>You should review their privacy policies before using VibeBot</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your information for as long as your account is active. You can
                request deletion of your account and all associated data at any time.
                Conversation history is retained until you manually delete it or close your
                account.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Self-Hosted Considerations</h2>
              <p className="text-muted-foreground">
                As a self-hosted application, you (or your administrator) have full control
                over:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Where your data is stored</li>
                <li>Who has access to the server and database</li>
                <li>Backup and retention policies</li>
                <li>Network security and access controls</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                The security and privacy of your data ultimately depends on how you deploy
                and configure VibeBot.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Your Rights</h2>
              <p className="text-muted-foreground">You have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Export your conversation history</li>
                <li>Opt out of data collection (by not using the service)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Children's Privacy</h2>
              <p className="text-muted-foreground">
                VibeBot is not intended for use by children under the age of 13. We do not
                knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">
                10. Changes to This Privacy Policy
              </h2>
              <p className="text-muted-foreground">
                We may update this Privacy Policy from time to time. We will notify you of
                any changes by posting the new Privacy Policy on this page and updating the
                "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">11. Contact</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact your VibeBot
                administrator or instance owner.
              </p>
            </section>

            <div className="flex gap-4 mt-8 pt-6 border-t">
              <Button asChild variant="outline">
                <Link to="/register">Back to Registration</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/terms">Terms of Service</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
