import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsConditions() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Terms and Conditions</h1>
        </div>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-400">
              <strong>Effective Date:</strong> March 13, 2026
            </p>
            <p className="text-sm text-gray-400 mt-1">
              <strong>Last Updated:</strong> March 13, 2026
            </p>
          </div>

          <section>
            <p>These Terms and Conditions ("Terms") govern your access to and use of the services provided by:</p>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mt-3 space-y-1">
              <p><strong>Company Name:</strong> Turboanswer</p>
              <p><strong>Address:</strong> 33 Broderick Street, Colonie, New York, 12205</p>
              <p><strong>Phone:</strong> 5185732922</p>
              <p><strong>E-Mail:</strong> support@turboanswer.it.com</p>
              <p><strong>Website:</strong> https://turbo-answer.replit.app</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using TurboAnswer's website, mobile application, or any related services (collectively, the "Service"), you agree to be bound by these Terms. If you do not agree to all of these Terms, you may not access or use the Service. By creating an account, you represent that you are at least 13 years of age, or the age of majority in your jurisdiction, whichever is greater.</p>
          </section>

          <section className="bg-blue-950 border border-blue-700 p-5 rounded-lg">
            <h2 className="text-2xl font-semibold text-blue-200 mb-3">1a. Age Requirement & Children's Privacy (COPPA)</h2>
            <p className="text-blue-100 mb-2">
              TurboAnswer is <strong>not intended for, directed to, or usable by children under the age of 13</strong>. By creating an account, you affirm under penalty of Terms violation that you are at least 13 years old. If you are between 13 and 18, you must have the permission of a parent or legal guardian to use the Service, and your parent or guardian is legally responsible for your account.
            </p>
            <p className="text-blue-100">
              We do not knowingly collect personal information from children under 13. Any account we discover to belong to a user under 13 will be <strong>terminated immediately and all associated data deleted</strong>. Parents may request account deletion at any time by emailing <a href="mailto:support@turboanswer.it.com" className="text-blue-300 underline">support@turboanswer.it.com</a> or calling <a href="tel:+18665677269" className="text-blue-300 underline">(866) 567-7269</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">2. Description of Service</h2>
            <p>TurboAnswer is an AI-powered assistant platform that provides intelligent responses across a wide range of topics including science, technology, law, finance, and general knowledge. The Service includes:</p>
            <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
              <li>AI-powered chat and question answering</li>
              <li>Image scanning and analysis (AI Scanner)</li>
              <li>Media editing tools (Photo Editor, Video Studio)</li>
              <li>Voice command functionality</li>
              <li>Crisis support resources</li>
              <li>Embeddable AI widget for websites</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">3. User Accounts</h2>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">a) Registration</h3>
                <p>To access certain features, you must create an account by providing accurate and complete information, including a valid email address, phone number, and password. You must verify your phone number via SMS verification before your account can be created.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">b) Account Security</h3>
                <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">c) One Account Per Person</h3>
                <p>Each individual may only maintain one account. Creating multiple accounts to circumvent bans, usage limits, or subscription restrictions is strictly prohibited and will result in termination of all associated accounts.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">4. Subscription Plans and Pricing</h2>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">a) Free Tier</h3>
                <p>Free accounts receive a limited number of daily questions using basic AI models. Free trial users who have not registered are limited to 5 questions total.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">b) Paid Plans</h3>
                <p>We offer Pro, Research, and Enterprise subscription tiers with varying levels of access, AI model availability, and features. Pricing and features for each tier are displayed on our Pricing page and may be updated at any time with reasonable notice.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">c) Billing</h3>
                <p>Paid subscriptions are billed on a recurring basis (monthly or annually as selected). By subscribing, you authorize us to charge your designated payment method (PayPal or other available methods) on each billing cycle. All prices are in USD unless otherwise stated.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">d) Free Trial</h3>
                <p>Certain plans may include a free trial period. If you do not cancel before the trial period ends, your subscription will automatically convert to a paid plan and you will be charged accordingly.</p>
              </div>
            </div>
          </section>

          <section className="bg-red-950 border border-red-700 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-red-300 mb-4">5. Refund Policy</h2>
            <div className="space-y-4">
              <div className="bg-red-900 p-4 rounded border border-red-600">
                <h3 className="text-xl font-semibold text-red-200 mb-2">10-Day Refund Window</h3>
                <p className="text-red-100">
                  All refund requests must be submitted within <strong>TEN (10) CALENDAR DAYS</strong> from the date of purchase.
                  After this 10-day period expires, <strong>NO REFUNDS WILL BE PROCESSED</strong> under any
                  circumstances, including but not limited to technical issues, dissatisfaction with service,
                  change of mind, or force majeure events.
                </p>
              </div>
              <div className="bg-red-900 p-4 rounded border border-red-600">
                <h3 className="text-xl font-semibold text-red-200 mb-2">Refund Process</h3>
                <p className="text-red-100">
                  To request a refund within the eligible window, contact us at support@turboanswer.it.com with your account email and reason for the request. Refunds will be processed to the original payment method within 5-10 business days.
                </p>
              </div>
              <div className="bg-red-900 p-4 rounded border border-red-600">
                <h3 className="text-xl font-semibold text-red-200 mb-2">No Refund for Policy Violations</h3>
                <p className="text-red-100">
                  Users who are banned or terminated for violating these Terms are <strong>NOT ELIGIBLE</strong> for any refund, partial refund, prorated credit, or future service credit, regardless of remaining subscription time.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Prohibited Uses</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <p className="mb-4">You agree NOT to use the Service for any of the following purposes. Violation will result in immediate account termination without refund:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Sexual or Adult Content:</strong> Any sexually explicit conversations, requests, or content of a sexual nature</li>
                <li><strong>Illegal Activities:</strong> Discussion or facilitation of drug use, criminal activities, fraud, hacking, violence, or terrorism</li>
                <li><strong>Harassment and Threats:</strong> Abusive language, threats, stalking, doxxing, or targeting individuals or groups</li>
                <li><strong>Hate Speech:</strong> Content promoting discrimination or hostility based on race, religion, gender, sexual orientation, disability, or other protected characteristics</li>
                <li><strong>Misinformation:</strong> Deliberately spreading false information, conspiracy theories, or dangerous medical advice</li>
                <li><strong>Copyright Infringement:</strong> Sharing copyrighted material without authorization or requesting assistance with piracy</li>
                <li><strong>Privacy Violations:</strong> Sharing others' personal information without consent or attempting to extract private data</li>
                <li><strong>System Abuse:</strong> Attempting to hack, exploit, reverse-engineer, or overwhelm our systems</li>
                <li><strong>Commercial Misuse:</strong> Using the Service for unauthorized commercial purposes, reselling access, or automated scraping</li>
                <li><strong>Impersonation:</strong> Misrepresenting your identity or affiliation with any person or organization</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Content Monitoring</h2>
            <div className="bg-yellow-950 border border-yellow-700 p-6 rounded-lg">
              <p className="mb-4">We employ automated systems and human moderators to monitor all content shared through the Service. By using the Service, you acknowledge and consent to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Real-time analysis of all messages for prohibited content</li>
                <li>Automated flagging and review of potentially violating content</li>
                <li>Periodic manual review of flagged conversations by our moderation team</li>
                <li>Storage and documentation of violations for enforcement and legal purposes</li>
              </ul>
              <p className="mt-4 text-yellow-200"><strong>Notice:</strong> Conversations that violate these Terms are not considered private and may be reviewed, stored, and disclosed as necessary.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">8. Intellectual Property</h2>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">a) Our Property</h3>
                <p>The Service, including its original content, features, functionality, design, and branding (excluding user-generated content), is and will remain the exclusive property of Turboanswer. The Service is protected by copyright, trademark, and other intellectual property laws.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">b) Your Content</h3>
                <p>You retain ownership of any content you submit to the Service. By submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, process, and store such content solely for the purpose of providing and improving the Service.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">c) AI-Generated Content</h3>
                <p>Responses generated by the AI are provided "as-is" for informational purposes. While you may use AI-generated responses for personal or commercial purposes as permitted by your subscription tier, we make no claim of ownership over AI outputs and provide no guarantee of accuracy, completeness, or originality.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">9. Disclaimers and Limitations</h2>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">a) No Professional Advice</h3>
                <p>AI-generated responses are for informational purposes only and do not constitute professional advice. This includes, but is not limited to, legal advice, medical advice, financial advice, or any other professional guidance. Always consult qualified professionals for important decisions.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">b) Service Availability</h3>
                <p>We strive to maintain continuous Service availability but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We are not liable for any loss or damage resulting from Service interruptions.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">c) Limitation of Liability</h3>
                <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, TURBOANSWER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">d) Warranty Disclaimer</h3>
                <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">10. Account Suspension and Termination</h2>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">a) By Us</h3>
                <p>We may suspend or terminate your account at any time, with or without cause, and with or without notice. Reasons include, but are not limited to, violation of these Terms, suspected fraudulent or illegal activity, or extended period of inactivity. Upon termination, your right to use the Service immediately ceases.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">b) By You</h3>
                <p>You may cancel your account at any time through your account settings or by contacting support. Cancellation of a paid subscription will take effect at the end of the current billing period. You will retain access to paid features until the end of your billing cycle.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">c) Data After Termination</h3>
                <p>Upon account termination, we may delete your data in accordance with our Privacy Policy and data retention practices. You may request a copy of your data before termination by contacting support@turboanswer.it.com.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">11. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless Turboanswer, its officers, directors, employees, agents, and affiliates from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or in any way connected with your access to or use of the Service, your violation of these Terms, or your violation of any third-party rights.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">12. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the State of New York, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Albany County, New York.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">13. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. When changes are made, we will update the "Last Updated" date at the top of this page. Continued use of the Service after changes are posted constitutes your acceptance of the modified Terms. For significant changes, we will make reasonable efforts to notify you via email or through the Service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">14. Severability</h2>
            <p>If any provision of these Terms is found to be unenforceable or invalid under applicable law, that provision shall be modified to the minimum extent necessary to make it enforceable, or if modification is not possible, shall be severed from these Terms. All remaining provisions shall continue in full force and effect.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">15. Entire Agreement</h2>
            <p>These Terms, together with our <Link href="/privacy-policy" className="text-blue-400 hover:text-blue-300 underline">Privacy Policy</Link> and any additional terms applicable to specific features, constitute the entire agreement between you and Turboanswer regarding your use of the Service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">16. Contact Us</h2>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 space-y-1">
              <p>If you have questions about these Terms, please contact us:</p>
              <p className="mt-2"><strong>Email:</strong> support@turboanswer.it.com</p>
              <p><strong>Phone:</strong> (518) 573-2922</p>
              <p><strong>Address:</strong> 33 Broderick Street, Colonie, New York, 12205</p>
            </div>
          </section>

          <div className="border-t border-gray-800 pt-6 pb-8 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Turboanswer. All rights reserved.</p>
            <div className="mt-2 flex justify-center gap-4">
              <Link href="/privacy-policy" className="text-blue-400 hover:text-blue-300 underline">Privacy Policy</Link>
              <Link href="/data-deletion" className="text-blue-400 hover:text-blue-300 underline">Data Deletion</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
