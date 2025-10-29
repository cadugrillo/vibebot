import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="prose dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using VibeBot, you accept and agree to be bound by the
                terms and provision of this agreement. If you do not agree to abide by the
                above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">2. Use License</h2>
              <p className="text-muted-foreground">
                Permission is granted to temporarily access VibeBot for personal,
                non-commercial transitory viewing only. This is the grant of a license, not
                a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc list-inside text-muted-foreground ml-4 space-y-1">
                <li>Modify or copy the materials</li>
                <li>Use the materials for any commercial purpose</li>
                <li>
                  Attempt to decompile or reverse engineer any software contained on
                  VibeBot
                </li>
                <li>
                  Remove any copyright or other proprietary notations from the materials
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">3. API Key Usage</h2>
              <p className="text-muted-foreground">
                You are responsible for managing your own API keys for Claude and OpenAI
                services. VibeBot does not store, log, or access your API keys beyond what
                is necessary to provide the service. You are responsible for any costs
                incurred through your API usage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">4. User Content</h2>
              <p className="text-muted-foreground">
                You retain all rights to the content you create through VibeBot. We do not
                claim ownership of your conversations, prompts, or any generated content.
                You are responsible for maintaining the confidentiality of your account and
                password.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">5. Disclaimer</h2>
              <p className="text-muted-foreground">
                The materials on VibeBot are provided on an 'as is' basis. VibeBot makes no
                warranties, expressed or implied, and hereby disclaims and negates all other
                warranties including, without limitation, implied warranties or conditions
                of merchantability, fitness for a particular purpose, or non-infringement of
                intellectual property or other violation of rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">6. Limitations</h2>
              <p className="text-muted-foreground">
                In no event shall VibeBot or its suppliers be liable for any damages
                (including, without limitation, damages for loss of data or profit, or due
                to business interruption) arising out of the use or inability to use
                VibeBot, even if VibeBot or an authorized representative has been notified
                orally or in writing of the possibility of such damage.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">7. Self-Hosted Deployment</h2>
              <p className="text-muted-foreground">
                If you are running a self-hosted instance of VibeBot, you are responsible
                for the security, maintenance, and compliance of your deployment. You must
                comply with all applicable laws and regulations in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">8. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Changes will be
                effective immediately upon posting to this page. Your continued use of
                VibeBot after any changes indicates your acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-3">9. Contact</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms of Service, please contact your
                VibeBot administrator or instance owner.
              </p>
            </section>

            <div className="flex gap-4 mt-8 pt-6 border-t">
              <Button asChild variant="outline">
                <Link to="/register">Back to Registration</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/privacy">Privacy Policy</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
