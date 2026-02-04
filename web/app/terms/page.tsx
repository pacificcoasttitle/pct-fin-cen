import { Metadata } from "next"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | FinClear",
  description: "Terms of Service for FinClear - PCT FinCEN Solutions. FinCEN compliance platform for title companies.",
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="pt-32 lg:pt-40">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mb-8">Last Updated: February 2026</p>
          
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and PCT FinCEN Solutions, a wholly-owned subsidiary of Pacific Coast Title Company (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), governing your access to and use of the FinClear platform, including all related services, software, and documentation (collectively, the &quot;Platform&quot;). By accessing or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must immediately cease all use of the Platform.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">1. Nature of the Platform</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The Platform is a technology tool designed to assist users in organizing, preparing, and transmitting reports that may be required under applicable FinCEN (Financial Crimes Enforcement Network) regulations, including but not limited to the Real Estate Reporting Rule.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4 uppercase text-sm tracking-wide font-medium">
              THE PLATFORM IS NOT A LAW FIRM AND DOES NOT PROVIDE LEGAL, TAX, ACCOUNTING, OR REGULATORY ADVICE.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The Platform automates certain data collection and filing workflows but does not make legal determinations regarding your reporting obligations. All determinations regarding whether a transaction is reportable, what information must be reported, and the accuracy of any filing remain solely and exclusively your responsibility. You should consult with qualified legal counsel regarding your specific compliance obligations. The inclusion of any guidance, prompts, decision trees, exemption logic, or educational content within the Platform does not constitute legal advice and should not be relied upon as such.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">2. Eligibility and Account Access</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is available only to businesses and individuals who have been onboarded through our account provisioning process. There is no self-service registration. Accounts are created by our operations team following a company onboarding review. You must be at least 18 years of age and have the legal authority to bind the entity on whose behalf you are using the Platform. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately at{" "}
              <a href="mailto:clear@fincenclear.com" className="text-primary hover:underline">clear@fincenclear.com</a>
              {" "}if you become aware of any unauthorized use of your account.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">3. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to use the Platform only for its intended purpose of FinCEN compliance assistance and in accordance with all applicable laws and regulations. You shall not: (a) use the Platform to submit false, misleading, or fraudulent information to FinCEN or any government agency; (b) attempt to reverse engineer, decompile, or disassemble any portion of the Platform; (c) use the Platform to engage in any activity that violates any law, regulation, or third-party right; (d) share your account credentials with unauthorized individuals; (e) use automated means (bots, scrapers, etc.) to access the Platform; or (f) attempt to interfere with or disrupt the Platform&apos;s infrastructure or security measures.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">4. Data Accuracy and User Responsibility</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              You are solely responsible for the accuracy, completeness, and truthfulness of all information you enter into the Platform. The Platform transmits data to FinCEN based on the information you provide.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4 uppercase text-sm tracking-wide font-medium">
              WE DO NOT INDEPENDENTLY VERIFY THE ACCURACY OF YOUR DATA.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Filing incorrect, incomplete, or false information with FinCEN may result in civil penalties, criminal prosecution, or other legal consequences, and such consequences are entirely your responsibility. You represent and warrant that all information submitted through the Platform is true, accurate, and complete to the best of your knowledge.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">5. Filing and Transmission</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform facilitates the electronic transmission of reports to FinCEN via the Secure Direct Transfer Mode (SDTM) or other approved methods. While we use commercially reasonable efforts to ensure reliable transmission, we do not guarantee that any filing will be accepted by FinCEN, processed within any specific timeframe, or free from errors caused by FinCEN system issues. You acknowledge that: (a) FinCEN may reject filings for reasons beyond our control; (b) system maintenance, outages, or connectivity issues may temporarily prevent filing; (c) acceptance of a filing by FinCEN does not constitute a determination that the filing is complete or correct; and (d) you remain responsible for monitoring the status of your filings and taking corrective action if needed. We will use commercially reasonable efforts to notify you of filing rejections or issues that come to our attention through our polling systems.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">6. Fees and Payment</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to pay all fees associated with your use of the Platform as established during your onboarding or as subsequently modified with written notice. Fees may include per-filing charges, subscription fees, or other charges as described in your service agreement. All fees are non-refundable unless otherwise stated in writing. We reserve the right to modify fees upon 30 days&apos; written notice. Failure to pay fees when due may result in suspension or termination of your access to the Platform.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">7. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed uppercase text-sm tracking-wide font-medium">
              THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING OR USAGE OF TRADE. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THAT ANY FILING WILL BE ACCEPTED BY FINCEN OR THAT THE PLATFORM WILL SATISFY YOUR SPECIFIC REGULATORY OBLIGATIONS. NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED FROM US OR THROUGH THE PLATFORM CREATES ANY WARRANTY NOT EXPRESSLY STATED IN THESE TERMS.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">8. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed uppercase text-sm tracking-wide font-medium">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS PARENT COMPANY (PACIFIC COAST TITLE COMPANY), OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE TOTAL AMOUNT OF FEES PAID BY YOU TO US DURING THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM. THIS LIMITATION APPLIES TO ALL CAUSES OF ACTION IN THE AGGREGATE, INCLUDING BUT NOT LIMITED TO BREACH OF CONTRACT, BREACH OF WARRANTY, NEGLIGENCE, AND OTHER TORTS. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, SO SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU, BUT THEY SHALL APPLY TO THE MAXIMUM EXTENT PERMITTED BY LAW.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">9. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless the Company, Pacific Coast Title Company, and their respective officers, directors, employees, agents, affiliates, successors, and assigns from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or relating to: (a) your use of the Platform; (b) your violation of these Terms; (c) the accuracy or completeness of data you submit through the Platform; (d) any FinCEN filing made through the Platform on your behalf; (e) your violation of any applicable law or regulation; or (f) your infringement of any third-party right. This indemnification obligation shall survive termination of these Terms and your use of the Platform.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">10. Dispute Resolution and Arbitration</h2>
            <p className="text-muted-foreground leading-relaxed uppercase text-sm tracking-wide font-medium mb-4">
              ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE PLATFORM SHALL BE RESOLVED BY BINDING ARBITRATION ADMINISTERED BY JAMS (JUDICIAL ARBITRATION AND MEDIATION SERVICES) IN ACCORDANCE WITH ITS COMPREHENSIVE ARBITRATION RULES AND PROCEDURES.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The arbitration shall be conducted in Los Angeles County, California, before a single arbitrator. The arbitrator&apos;s decision shall be final and binding and may be entered as a judgment in any court of competent jurisdiction. Each party shall bear its own costs and attorneys&apos; fees in connection with the arbitration, unless the arbitrator determines otherwise.
            </p>
            <p className="text-muted-foreground leading-relaxed uppercase text-sm tracking-wide font-medium mb-4">
              YOU AGREE THAT ANY ARBITRATION SHALL BE CONDUCTED ON AN INDIVIDUAL BASIS AND NOT AS A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. YOU ARE WAIVING YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If any provision of this arbitration agreement is found to be unenforceable, the remaining provisions shall remain in full force and effect. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement of intellectual property rights.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. To the extent that litigation is permitted under these Terms, the exclusive jurisdiction and venue shall be the state and federal courts located in Los Angeles County, California, and you hereby consent to the personal jurisdiction of such courts.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">12. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, features, functionality, software, designs, text, graphics, logos, and other materials available through the Platform are owned by the Company or its licensors and are protected by copyright, trademark, patent, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform solely for its intended purpose during the term of your account. You may not copy, modify, distribute, sell, or lease any part of the Platform.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">13. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice. Upon termination, your right to use the Platform ceases immediately. Provisions of these Terms that by their nature should survive termination shall survive, including but not limited to Sections 7 through 12. You may request termination of your account by contacting us at{" "}
              <a href="mailto:clear@fincenclear.com" className="text-primary hover:underline">clear@fincenclear.com</a>.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">14. Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your use of the Platform is also governed by our{" "}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
              {" "}By using the Platform, you consent to the collection, use, and disclosure of your information as described in the Privacy Policy.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">15. Modifications to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these Terms at any time. Material changes will be communicated via email to the address associated with your account or through a notice on the Platform. Your continued use of the Platform following any modification constitutes your acceptance of the modified Terms. If you do not agree to any modification, you must cease using the Platform.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">16. Miscellaneous</h2>
            <p className="text-muted-foreground leading-relaxed">
              (a) <strong>Entire Agreement:</strong> These Terms, together with the Privacy Policy and any applicable service agreement, constitute the entire agreement between you and the Company regarding the Platform. (b) <strong>Severability:</strong> If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall continue in full force and effect. (c) <strong>Waiver:</strong> Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. (d) <strong>Assignment:</strong> You may not assign these Terms without our prior written consent. We may assign these Terms without restriction. (e) <strong>Force Majeure:</strong> We shall not be liable for any delay or failure in performance resulting from causes beyond our reasonable control, including but not limited to acts of God, government actions, FinCEN system outages, internet service disruptions, or pandemics. (f) <strong>Notices:</strong> All notices to us should be sent to{" "}
              <a href="mailto:clear@fincenclear.com" className="text-primary hover:underline">clear@fincenclear.com</a>.
              {" "}Notices to you will be sent to the email address associated with your account.
            </p>

            <h2 className="text-xl font-semibold text-foreground mt-10 mb-4">17. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us at:
            </p>
            <div className="mt-4 text-muted-foreground">
              <p className="font-medium text-foreground">PCT FinCEN Solutions</p>
              <p>Email: <a href="mailto:clear@fincenclear.com" className="text-primary hover:underline">clear@fincenclear.com</a></p>
              <p>Website: <a href="https://www.fincenclear.com" className="text-primary hover:underline">www.fincenclear.com</a></p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  )
}
