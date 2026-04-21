import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-400">
              <strong>Effective Date:</strong> February 6, 2026
            </p>
          </div>

          <section>
            <p>This Privacy Policy is between you and the following organization:</p>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mt-3 space-y-1">
              <p><strong>Company Name:</strong> Turboanswer</p>
              <p><strong>Address:</strong> 33 Broderick Street, Colonie, New York, 12205</p>
              <p><strong>Phone:</strong> 5185732922</p>
              <p><strong>E-Mail:</strong> support@turboanswer.it.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Website</h2>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 space-y-1">
              <p><strong>Website URL:</strong> https://ai-companion-tiagotschantret.replit.app/</p>
              <p><strong>Website Name:</strong> Turboanswer</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-3">Mobile App</h2>
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 space-y-1">
              <p><strong>Mobile App Name:</strong> TurboAnswer</p>
              <p><strong>Available on:</strong> Apple App Store (iOS) + Google Play Store (Android)</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Personal Information Collected</h2>
            <p className="mb-4">In the past 12 months, we have or had the intention of collecting the following:</p>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Identifiers</h3>
                <p>A real name or alias, postal address, signature, home phone number or mobile phone number, bank account number, credit card number, debit card number or other financial information, physical characteristics or description, e-mail address; account name, Social Security Number (SSN), driver's license number or state identification card number, passport number, or other similar identifiers.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Commercial Information</h3>
                <p>Records of personal property, products or services purchased, obtained, considered, or other purchasing or consuming histories or tendencies.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Inferences Drawn From Other Personal Information</h3>
                <p>Profile reflecting a person's preference, characteristics, psychological trends, predispositions, behavior, attitudes, intelligence, abilities, and aptitudes.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Geolocation Data</h3>
                <p>Physical location or movements. For example, city, state, country, and ZIP code associated with your IP address or derived through Wi-Fi triangulation; and, with permission in on your mobile device settings, and precise geolocation information from GPS-based functionality on your mobile devices.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Sensory Data</h3>
                <p>Audio, electronic, visual, thermal, olfactory, or similar information.</p>
              </div>
            </div>
            <p className="mt-4 text-gray-400 italic">Hereinafter known as "Personal Information."</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Creating a User Profile or Account</h2>
            <p>We may collect information directly from you or an agent authorized to act on your behalf. For example, if you, or someone acting on your behalf, provides your name and e-mail to create a profile or an account. We also collect information indirectly from you or your authorized agent. This can be done through information we collect from you while providing content, products, or services.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Cookies Policy</h2>
            <p className="mb-4">Currently, our website and mobile app uses cookies to provide you with the best experience possible. We, in addition to our service providers, affiliates, agents, advertisers, or other parties in connection with the website and mobile app, may deploy cookies, web beacons, local shared objects, and other tracking technologies for various purposes. Such shall be for business use, marketing purposes, fraud prevention, and to assist in the day-to-day operations of the website and mobile app.</p>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">a) "Cookies" Defined</h3>
                <p>Cookies act as data that is communicated between a user's web browser and a website or application. They are stored on your device to help track their areas of interest, provide the best experience possible, and customize the content, products, services, offerings, and advertisements served on the website and mobile app. Most web browsers adjust to your browser's settings to decline or delete cookies, but doing so may degrade the experience with our online services.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">b) 1-Pixel Images</h3>
                <p>Clear GIFs, pixel tags, or web beacons, which are generally 1-pixel, are transparent images located on a webpage or in an e-mail or other trackable source and may be used on our website and mobile app in addition to any other communication offered by us. They are often used in connection with advertisements served to you that are interacted with, whether on our website and mobile app or another online service and shared with us. This type of tracking is specifically meant to recognize users, assess traffic patterns, and measure site or campaign engagement.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">c) Flash Cookies</h3>
                <p>Local Shared Objects, sometimes known as "flash cookies," may be stored on your device using a media player or other software. Flash cookies are similar to cookies in terms of their operation but may be managed in your browser in the same manner.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">d) First (1st) Party & Third (3rd) Cookies</h3>
                <p>First (1st) party cookies are stored by a domain (website and mobile app) you are visiting directly. They allow us to collect analytics data, remember preferred settings (e.g., language, currency, etc.), and perform related functions. Third (3rd) party cookies are created by domains other than those you are visiting directly, hence its name "third (3rd) party." They may be used for cross-tracking, retargeting, and ad-serving.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">e) Essential Cookies</h3>
                <p>Such cookies are technically necessary to provide website and mobile app functionality. They act as a basic form of memory, used to store the preferences selected by a user on a given website or application. They are essential to browsing functionality and cannot be disabled by users. As an example, an essential cookie may be used to recognize a past user from having to log in each time they visit a new page in the same session.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">f) Performance and Function Cookies</h3>
                <p>Such cookies are used to enhance the performance and functionality of a website and mobile app but are not essential to its use. However, without these cookies, certain functions (like videos) may become unavailable.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">g) Advertising Cookies</h3>
                <p>Such cookies are used to customize a user's ad experience on a website and mobile app. When using data collected from cookies, it can prevent the same ad from appearing multiple times in the same session or that does not offer a pleasant experience. Advertising cookies may be used to serve a user with related services, products, or offerings that they may have shown a level of related interest in their past user history.</p>
              </div>
            </div>
            <p className="mt-4">If you would like to know more about cookies and how they are used, please visit <a href="https://www.allaboutcookies.org" className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a>.</p>
            <p className="mt-2">You can set your browser not to accept cookies, and the above website tells you how to remove cookies from your browser. However, in a few cases, some of our website features may not function as a result.</p>
          </section>

          <section className="bg-blue-950 border border-blue-700 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-blue-200 mb-4">Children's Privacy (COPPA)</h2>
            <div className="space-y-3 text-blue-100">
              <p>
                TurboAnswer is <strong>not directed to, designed for, or intended for use by children under the age of 13</strong>. In compliance with the Children's Online Privacy Protection Act ("COPPA"), 15 U.S.C. §§ 6501–6506, and its implementing regulations at 16 C.F.R. Part 312, we do not knowingly collect, use, or disclose personal information from any child under 13 years of age.
              </p>
              <p>
                All users must confirm they are at least 13 years old before creating an account. Account creation is prohibited for anyone under 13.
              </p>
              <p>
                If we learn, or are notified, that we have inadvertently collected personal information from a child under 13 without verified parental consent, we will <strong>promptly delete that information from our systems</strong>.
              </p>
              <p>
                <strong>Parents or legal guardians:</strong> if you believe your child under 13 has provided personal information to TurboAnswer, please contact us immediately at <a href="mailto:support@turboanswer.it.com" className="text-blue-300 hover:text-blue-200 underline">support@turboanswer.it.com</a> or call <a href="tel:+18665677269" className="text-blue-300 hover:text-blue-200 underline">(866) 567-7269</a>. We will verify the request and delete the account and all associated data within 10 business days.
              </p>
              <p>
                Users between 13 and 18 should use TurboAnswer only with the involvement and consent of a parent or legal guardian, and the account holder (or their parent/guardian) is responsible for all activity on the account.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Advertisements</h2>
            <p>Our website and mobile app does not show advertisements to users. This includes affiliate ads or any products and services offered by 3rd parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">How We Use Personal Information</h2>
            <p className="mb-3">We may use or disclose your Personal Information for the following purpose:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>Feedback.</strong> To get feedback on website and mobile app improvements and generally provide an overall better experience.</li>
              <li><strong>Testing.</strong> For testing, research, and analysis, of user behavior on the website and mobile app.</li>
              <li><strong>Law Enforcement.</strong> To respond to law enforcement requests as required by applicable law, court order, or governmental regulations.</li>
              <li><strong>Intended Purpose.</strong> As described for the intended purpose when collecting your personal information.</li>
              <li><strong>Assessment.</strong> To evaluate or conduct a merger, divestiture, restricting, reorganizing, dissolution, or outright sale, either wholly or partially, of our assets in which your Personal Information becomes a part of such sale.</li>
            </ul>
            <p className="mt-4">Our usage of your Personal Information may change over time, and when such changes occur, we will update this Privacy Policy accordingly.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Selling Personal Information</h2>
            <div className="bg-green-950 border border-green-700 p-4 rounded-lg">
              <p className="text-green-200">Our policy is that we <strong>DO NOT</strong> sell your personal information. If this should change, you will be notified and this Privacy Policy will be updated.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Sharing Personal Information</h2>
            <p className="mb-3">We disclose your Personal Information to 3rd parties for business purposes. The general categories of 3rd parties that we share with are as follows:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Our 3rd party service providers that, without their services, our website and mobile app would not be able to function in its current manner;</li>
              <li>Affiliated websites and businesses in an effort to bring you and our users improved services, products, and offerings;</li>
              <li>Other companies, affiliate partners, and 3rd parties that help us advertise products, services, and offerings to you, other users, and potential new customers;</li>
              <li>Third (3rd) parties to whom you, or an authorized agent on your behalf, authorized us to disclose your Personal Information;</li>
              <li>Third (3rd) parties or affiliates in connection with a corporate transaction, such as a sale, consolidation, or merger of our financial institution or affiliated business; and</li>
              <li>Other third (3rd) parties to comply with legal requirements or to disclose Personal Information to government authorities per the rule of law.</li>
            </ul>
            <p className="mt-4">In the last 12 months, it is recognized that we have disclosed the aforementioned categories of Personal Information for business purposes.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Rights and Choices</h2>
            <p className="mb-4">This Section describes your rights and choices regarding how we collect, share, use, and protect your Personal Information, how to exercise those rights, and limits and exceptions to your rights and choices.</p>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">a) Exceptions</h3>
                <p>The rights and choices in this Section do not apply to you if the information being collected is:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>Aggregate consumer information;</li>
                  <li>Deidentified Personal Information; and</li>
                  <li>Publicly available information.</li>
                </ul>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">b) Access to Information</h3>
                <p>If the above exceptions do not apply, and you have not made this request more than twice in a 12-month period, you have the right to request that we disclose certain information to you about our collection and use of your Personal Information over the past 12 months from the date we receive your request. Once we receive and confirm your request on your behalf, we will disclose it to you or your representative:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>The categories of Personal Information we collect;</li>
                  <li>The categories of sources for the Personal Information we collect;</li>
                  <li>Our business or commercial purpose for collecting or selling such Personal Information;</li>
                  <li>The categories of third parties to whom we sold or disclosed the category of Personal Information for a business or commercial purpose;</li>
                  <li>The business or commercial purpose for which we sold or disclosed the category of Personal Information; and</li>
                  <li>The specific pieces of Personal Information we collected about you in a form that you can take with you (also called a "Data Portability Request").</li>
                </ul>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">c) Deletion (Erasure) Request Rights</h3>
                <p>You have the right to request that we delete any of your Personal Information that we collect from you and retain, subject to certain exceptions. Once we receive and verify your request, we will delete and direct our service providers to delete your Personal Information from our records unless an exception applies. We may deny your deletion request if retaining the Personal Information is necessary for us or our service providers to:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>Complete the transaction for which we collected the Personal Information, provide a good or service that you requested, take actions reasonably anticipated within the context of our ongoing business relationship with you, or otherwise perform our contract with you;</li>
                  <li>Detect security incidents, protect against malicious, deceptive, fraudulent, or illegal activity; or prosecute those for such activity;</li>
                  <li>Debug to identify and repair errors that impair existing intended functionality;</li>
                  <li>Exercise free speech, or exercise another right provided by law;</li>
                  <li>Engage in public or peer-reviewed scientific, historical, or statistical research in the public interest that adheres to all other applicable ethics and privacy laws when the businesses' deletion of the Personal Information is likely to render impossible or seriously impair the achievement of such research if you previously provided informed consent;</li>
                  <li>Enable solely internal and lawful uses of such Personal Information that are compatible with the context in which you provided it.</li>
                </ul>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">d) Exercising Access, Data Portability, and Deletion Rights</h3>
                <p>To exercise the access, data portability, deletion rights, or any other rights mentioned herein, a consumer or a consumer's authorized agent may submit a verifiable request to us by using the contact details mentioned herein.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">e) Requests</h3>
                <p>You may only make a verifiable consumer request for access or data portability in relation to this Section. We cannot respond to your request or provide you with Personal Information if we cannot verify your identity or authority to make the request and confirm the Personal Information is related to you. Making a verifiable consumer request does not require you to create an account with us.</p>
              </div>
            </div>
          </section>

          <section className="bg-red-950 border border-red-700 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-red-300 mb-4">Critical Refund Limitations</h2>
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
                <h3 className="text-xl font-semibold text-red-200 mb-2">Zero Tolerance Policy</h3>
                <p className="text-red-100">
                  Users engaging in sexual content, explicit conversations, illegal activities, or prohibited content will be <strong>PERMANENTLY BANNED IMMEDIATELY</strong> with <strong>ZERO REFUND ELIGIBILITY</strong>. This includes partial refunds, prorated refunds, or future service credits.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Prohibited Content and Activities</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <p className="mb-4">The following activities are <strong>ABSOLUTELY PROHIBITED</strong> and will result in immediate account termination without refund:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Sexual Content:</strong> Any sexually explicit conversations, adult content discussions, romantic or intimate dialogue, or requests for sexual advice or information</li>
                <li><strong>Illegal Activities:</strong> Discussion of illegal drug use, criminal activities, fraud, hacking, violence, terrorism, or any content that violates local, state, or federal laws</li>
                <li><strong>Harassment:</strong> Abusive language, threats, stalking, doxxing, or targeting individuals or groups with harmful content</li>
                <li><strong>Hate Speech:</strong> Content promoting discrimination, violence, or hostility against individuals or groups based on race, religion, gender, sexual orientation, or other characteristics</li>
                <li><strong>Misinformation:</strong> Deliberately spreading false information, conspiracy theories, or dangerous medical advice</li>
                <li><strong>Copyright Infringement:</strong> Sharing copyrighted material without authorization or requesting assistance with piracy</li>
                <li><strong>Privacy Violations:</strong> Sharing personal information of others without consent or attempting to extract private data</li>
                <li><strong>System Abuse:</strong> Attempting to hack, exploit, or overwhelm our systems, or using the service for unauthorized commercial purposes</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Content Monitoring and Moderation</h2>
            <div className="bg-yellow-950 border border-yellow-700 p-6 rounded-lg">
              <p className="mb-4">We employ both automated systems and human moderators to monitor all conversations and content shared through our platform. This monitoring includes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Real-time analysis of all messages for prohibited content</li>
                <li>Periodic manual review of flagged conversations</li>
                <li>Pattern recognition for detecting policy violations</li>
                <li>Escalation to senior moderation team for serious violations</li>
                <li>Documentation of violations for potential legal action</li>
              </ul>
              <p className="mt-4 text-yellow-200"><strong>Important:</strong> By using our service, you consent to this monitoring and acknowledge that conversations are not private when they violate our terms.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Account Termination</h2>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Immediate Termination</h3>
                <p>We reserve the right to immediately suspend or terminate your account without prior notice for any violation of this Policy. Terminated accounts will lose access to all services, conversation history, and premium features without compensation.</p>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Appeal Process</h3>
                <p>Users may submit one appeal within 30 days of account termination. Appeals must include detailed explanation and acknowledgment of policy violations. Appeals for sexual or illegal content violations will not be considered under any circumstances.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Payment Terms and Billing</h2>
            <div className="space-y-4">
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Subscription Billing</h3>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>All subscriptions are billed in advance on a monthly or annual basis</li>
                  <li>Payments are processed through secure third-party payment processors</li>
                  <li>Failed payments may result in service suspension after grace period</li>
                  <li>Price changes will be communicated 30 days in advance</li>
                  <li>Currency conversion fees may apply for international transactions</li>
                </ul>
              </div>
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">Promotional Codes</h3>
                <p>Promotional codes and discounts are subject to specific terms and expiration dates. Promotional pricing does not extend refund periods or modify prohibited content policies.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Legal Compliance and Law Enforcement</h2>
            <div className="bg-blue-950 border border-blue-700 p-6 rounded-lg">
              <p className="mb-4">We fully cooperate with law enforcement agencies and legal authorities when required by law. This may include:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Providing user data and conversation logs in response to valid legal requests</li>
                <li>Reporting suspected illegal activities to appropriate authorities</li>
                <li>Preserving evidence of criminal activity discovered through our monitoring</li>
                <li>Assisting in investigations related to platform abuse or criminal behavior</li>
              </ul>
              <p className="mt-4 text-blue-200"><strong>Disclaimer:</strong> We are not responsible for legal consequences resulting from user violations of local, state, or federal laws.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Limitation of Liability</h2>
            <div className="space-y-4">
              <p>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TURBO ANSWER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Loss of profits, data, or business opportunities</li>
                <li>Service interruptions or technical failures</li>
                <li>Damages resulting from reliance on AI-generated content</li>
                <li>Third-party actions or content accessed through our platform</li>
                <li>Costs of procurement of substitute services</li>
              </ul>
              <p className="mt-4">Our total liability for any claims shall not exceed the amount paid by you for the service during the twelve (12) months preceding the claim.</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Policy Updates and Modifications</h2>
            <p className="mb-3">We reserve the right to modify this Privacy Policy at any time. Material changes will be communicated through:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Email notifications to registered users</li>
              <li>In-app notifications and banners</li>
              <li>Updates to this policy page with revised effective dates</li>
              <li>Service announcements for significant changes</li>
            </ul>
            <p className="mt-4">Continued use of the service after policy updates constitutes acceptance of the revised terms. Users who disagree with updated terms must discontinue service use and may request account deletion.</p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
            <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
              <ul className="space-y-2">
                <li><strong>Company:</strong> Turboanswer</li>
                <li><strong>Address:</strong> 33 Broderick Street, Colonie, New York, 12205</li>
                <li><strong>Phone:</strong> 5185732922</li>
                <li><strong>E-Mail:</strong> support@turboanswer.it.com</li>
              </ul>
            </div>
          </section>

          <section className="bg-gray-900 border border-gray-700 p-6 rounded-lg">
            <h2 className="text-2xl font-semibold text-white mb-4">User Acknowledgment</h2>
            <p className="text-gray-300 leading-relaxed">
              By accessing or using Turbo Answer, you acknowledge that you have read, understood, and agree
              to be bound by this comprehensive Privacy Policy. You specifically acknowledge
              understanding of the <strong>10-day refund limitation</strong> and the <strong>zero-tolerance
              policy for sexual and illegal content</strong> that results in permanent ban without refund.
              You further acknowledge that all conversations may be monitored for compliance and that
              violations may result in immediate account termination and potential legal consequences.
            </p>
            <p className="text-gray-400 text-sm mt-4">
              This policy constitutes a legally binding agreement between you and Turbo Answer. If you do
              not agree with any part of this policy, you must immediately discontinue use of our services.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
