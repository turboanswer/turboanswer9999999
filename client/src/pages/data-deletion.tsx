import { Link } from "wouter";
import { ArrowLeft, Trash2, Mail, Settings } from "lucide-react";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Data Deletion Request</h1>
        </div>

        <div className="space-y-6 text-gray-300 leading-relaxed">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-400">
              <strong>Last Updated:</strong> March 2026
            </p>
          </div>

          <p>
            You have the right to request deletion of your personal data at any time.
            Turbo Answer provides two ways to do this:
          </p>

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-800 flex items-start gap-4">
              <div className="bg-blue-600 rounded-lg p-2 mt-1 shrink-0">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Option 1 — Delete from your account (instant)</h2>
                <p className="text-gray-400 text-sm mb-3">
                  If you have an account, you can delete all your data immediately from inside the app.
                </p>
                <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Log in to your Turbo Answer account</li>
                  <li>Go to <strong>AI Settings</strong> (gear icon in the chat header)</li>
                  <li>Scroll to the bottom of the page</li>
                  <li>Click <strong>"Delete My Account"</strong> and confirm</li>
                </ol>
                <p className="text-sm text-gray-500 mt-3">
                  This permanently deletes your account, all conversations, payment history, and personal data. Any active subscription is automatically cancelled.
                </p>
              </div>
            </div>

            <div className="p-5 flex items-start gap-4">
              <div className="bg-purple-600 rounded-lg p-2 mt-1 shrink-0">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Option 2 — Email request</h2>
                <p className="text-gray-400 text-sm mb-3">
                  If you no longer have access to your account or prefer to request deletion by email:
                </p>
                <a
                  href="mailto:support@turboanswer.it.com?subject=Data%20Deletion%20Request&body=Please%20delete%20all%20personal%20data%20associated%20with%20my%20account.%0A%0AEmail%20address%3A%20%5Byour%20email%5D"
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  Send deletion request email
                </a>
                <p className="text-sm text-gray-500 mt-3">
                  Email: <strong className="text-gray-300">support@turboanswer.it.com</strong><br />
                  Include the email address linked to your account. We will process your request within <strong className="text-gray-300">30 days</strong> and confirm by email when complete.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
            <div className="flex items-start gap-3">
              <Trash2 className="w-5 h-5 text-red-400 mt-1 shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-white mb-2">What gets deleted</h2>
                <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                  <li>Your account profile and email address</li>
                  <li>All conversation history</li>
                  <li>Subscription and billing records</li>
                  <li>Voice and usage preferences</li>
                  <li>Any uploaded images or files</li>
                  <li>Crisis support conversation data (encrypted, stored separately)</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-500">
            For any questions, contact us at{" "}
            <a href="mailto:support@turboanswer.it.com" className="text-blue-400 hover:underline">
              support@turboanswer.it.com
            </a>{" "}
            or call <strong className="text-gray-300">(866) 320-6042</strong>, Mon–Fri 9:30am–6pm EST.
          </p>
        </div>
      </div>
    </div>
  );
}
