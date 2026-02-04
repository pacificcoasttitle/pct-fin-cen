# Cursor Prompt: Legal Pages — Terms of Service + Privacy Policy

## Context

FinClear is a compliance SaaS platform operated by **PCT FinCEN Solutions**, a wholly-owned subsidiary of **Pacific Coast Title Company**. The platform helps title companies comply with FinCEN Real Estate Reporting requirements.

The legal page stubs were created in the previous prompt. Now we need to populate them with comprehensive legal content.

**Key legal framework:**
- California law governs
- Multi-layered liability protection
- Technology tool only — NOT legal advice
- Arbitration required, class action waiver
- California Civil Code §1668 compliant
- Indemnification clauses
- Limitation of liability
- Data handling disclosures for FinCEN filing data

**Support email:** `clear@fincenclear.com`

---

## TASK 1: Populate Terms of Service

### File: `web/app/(marketing)/terms/page.tsx` (or `web/app/terms/page.tsx` — wherever the stub was created)

Replace the placeholder content inside the `<div id="terms-content">` with the following complete Terms of Service. Render it as clean, readable HTML with proper heading hierarchy. Use Tailwind `prose` classes for typography.

**IMPORTANT:** Render this as JSX — not raw HTML. Use `className` not `class`. Use self-closing tags where needed. Escape curly braces in JSX if needed.

---

### TERMS OF SERVICE CONTENT:

Structure the page with these sections, each as an `<h2>` with the content below as `<p>` tags:

**Page title:** Terms of Service  
**Subtitle:** Last Updated: February 2026  
**Intro paragraph:**

These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and PCT FinCEN Solutions, a wholly-owned subsidiary of Pacific Coast Title Company ("Company," "we," "us," or "our"), governing your access to and use of the FinClear platform, including all related services, software, and documentation (collectively, the "Platform"). By accessing or using the Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree, you must immediately cease all use of the Platform.

**Section 1: Nature of the Platform**

The Platform is a technology tool designed to assist users in organizing, preparing, and transmitting reports that may be required under applicable FinCEN (Financial Crimes Enforcement Network) regulations, including but not limited to the Real Estate Reporting Rule. THE PLATFORM IS NOT A LAW FIRM AND DOES NOT PROVIDE LEGAL, TAX, ACCOUNTING, OR REGULATORY ADVICE. The Platform automates certain data collection and filing workflows but does not make legal determinations regarding your reporting obligations. All determinations regarding whether a transaction is reportable, what information must be reported, and the accuracy of any filing remain solely and exclusively your responsibility. You should consult with qualified legal counsel regarding your specific compliance obligations. The inclusion of any guidance, prompts, decision trees, exemption logic, or educational content within the Platform does not constitute legal advice and should not be relied upon as such.

**Section 2: Eligibility and Account Access**

The Platform is available only to businesses and individuals who have been onboarded through our account provisioning process. There is no self-service registration. Accounts are created by our operations team following a company onboarding review. You must be at least 18 years of age and have the legal authority to bind the entity on whose behalf you are using the Platform. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately at clear@fincenclear.com if you become aware of any unauthorized use of your account.

**Section 3: Acceptable Use**

You agree to use the Platform only for its intended purpose of FinCEN compliance assistance and in accordance with all applicable laws and regulations. You shall not: (a) use the Platform to submit false, misleading, or fraudulent information to FinCEN or any government agency; (b) attempt to reverse engineer, decompile, or disassemble any portion of the Platform; (c) use the Platform to engage in any activity that violates any law, regulation, or third-party right; (d) share your account credentials with unauthorized individuals; (e) use automated means (bots, scrapers, etc.) to access the Platform; or (f) attempt to interfere with or disrupt the Platform's infrastructure or security measures.

**Section 4: Data Accuracy and User Responsibility**

You are solely responsible for the accuracy, completeness, and truthfulness of all information you enter into the Platform. The Platform transmits data to FinCEN based on the information you provide. WE DO NOT INDEPENDENTLY VERIFY THE ACCURACY OF YOUR DATA. Filing incorrect, incomplete, or false information with FinCEN may result in civil penalties, criminal prosecution, or other legal consequences, and such consequences are entirely your responsibility. You represent and warrant that all information submitted through the Platform is true, accurate, and complete to the best of your knowledge.

**Section 5: Filing and Transmission**

The Platform facilitates the electronic transmission of reports to FinCEN via the Secure Direct Transfer Mode (SDTM) or other approved methods. While we use commercially reasonable efforts to ensure reliable transmission, we do not guarantee that any filing will be accepted by FinCEN, processed within any specific timeframe, or free from errors caused by FinCEN system issues. You acknowledge that: (a) FinCEN may reject filings for reasons beyond our control; (b) system maintenance, outages, or connectivity issues may temporarily prevent filing; (c) acceptance of a filing by FinCEN does not constitute a determination that the filing is complete or correct; and (d) you remain responsible for monitoring the status of your filings and taking corrective action if needed. We will use commercially reasonable efforts to notify you of filing rejections or issues that come to our attention through our polling systems.

**Section 6: Fees and Payment**

You agree to pay all fees associated with your use of the Platform as established during your onboarding or as subsequently modified with written notice. Fees may include per-filing charges, subscription fees, or other charges as described in your service agreement. All fees are non-refundable unless otherwise stated in writing. We reserve the right to modify fees upon 30 days' written notice. Failure to pay fees when due may result in suspension or termination of your access to the Platform.

**Section 7: Disclaimer of Warranties**

THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES ARISING OUT OF COURSE OF DEALING OR USAGE OF TRADE. WE DO NOT WARRANT THAT THE PLATFORM WILL BE UNINTERRUPTED, ERROR-FREE, SECURE, OR FREE FROM VIRUSES OR OTHER HARMFUL COMPONENTS. WE DO NOT WARRANT THAT ANY FILING WILL BE ACCEPTED BY FINCEN OR THAT THE PLATFORM WILL SATISFY YOUR SPECIFIC REGULATORY OBLIGATIONS. NO ADVICE OR INFORMATION, WHETHER ORAL OR WRITTEN, OBTAINED FROM US OR THROUGH THE PLATFORM CREATES ANY WARRANTY NOT EXPRESSLY STATED IN THESE TERMS.

**Section 8: Limitation of Liability**

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS PARENT COMPANY (PACIFIC COAST TITLE COMPANY), OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, BUSINESS, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE PLATFORM, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE PLATFORM SHALL NOT EXCEED THE TOTAL AMOUNT OF FEES PAID BY YOU TO US DURING THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM. THIS LIMITATION APPLIES TO ALL CAUSES OF ACTION IN THE AGGREGATE, INCLUDING BUT NOT LIMITED TO BREACH OF CONTRACT, BREACH OF WARRANTY, NEGLIGENCE, AND OTHER TORTS. SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, SO SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU, BUT THEY SHALL APPLY TO THE MAXIMUM EXTENT PERMITTED BY LAW.

**Section 9: Indemnification**

You agree to indemnify, defend, and hold harmless the Company, Pacific Coast Title Company, and their respective officers, directors, employees, agents, affiliates, successors, and assigns from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to: (a) your use of the Platform; (b) your violation of these Terms; (c) the accuracy or completeness of data you submit through the Platform; (d) any FinCEN filing made through the Platform on your behalf; (e) your violation of any applicable law or regulation; or (f) your infringement of any third-party right. This indemnification obligation shall survive termination of these Terms and your use of the Platform.

**Section 10: Dispute Resolution and Arbitration**

ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE PLATFORM SHALL BE RESOLVED BY BINDING ARBITRATION ADMINISTERED BY JAMS (JUDICIAL ARBITRATION AND MEDIATION SERVICES) IN ACCORDANCE WITH ITS COMPREHENSIVE ARBITRATION RULES AND PROCEDURES. The arbitration shall be conducted in Los Angeles County, California, before a single arbitrator. The arbitrator's decision shall be final and binding and may be entered as a judgment in any court of competent jurisdiction. Each party shall bear its own costs and attorneys' fees in connection with the arbitration, unless the arbitrator determines otherwise. You agree that any arbitration shall be conducted on an individual basis and not as a class, consolidated, or representative action. YOU ARE WAIVING YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION. If any provision of this arbitration agreement is found to be unenforceable, the remaining provisions shall remain in full force and effect. Notwithstanding the foregoing, either party may seek injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement of intellectual property rights.

**Section 11: Governing Law**

These Terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions. To the extent that litigation is permitted under these Terms, the exclusive jurisdiction and venue shall be the state and federal courts located in Los Angeles County, California, and you hereby consent to the personal jurisdiction of such courts.

**Section 12: Intellectual Property**

All content, features, functionality, software, designs, text, graphics, logos, and other materials available through the Platform are owned by the Company or its licensors and are protected by copyright, trademark, patent, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable, revocable license to access and use the Platform solely for its intended purpose during the term of your account. You may not copy, modify, distribute, sell, or lease any part of the Platform.

**Section 13: Termination**

We may suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice. Upon termination, your right to use the Platform ceases immediately. Provisions of these Terms that by their nature should survive termination shall survive, including but not limited to Sections 7 through 12. You may request termination of your account by contacting us at clear@fincenclear.com.

**Section 14: Privacy**

Your use of the Platform is also governed by our Privacy Policy, available at [link to /privacy]. By using the Platform, you consent to the collection, use, and disclosure of your information as described in the Privacy Policy.

**Section 15: Modifications to Terms**

We reserve the right to modify these Terms at any time. Material changes will be communicated via email to the address associated with your account or through a notice on the Platform. Your continued use of the Platform following any modification constitutes your acceptance of the modified Terms. If you do not agree to any modification, you must cease using the Platform.

**Section 16: Miscellaneous**

(a) Entire Agreement: These Terms, together with the Privacy Policy and any applicable service agreement, constitute the entire agreement between you and the Company regarding the Platform. (b) Severability: If any provision of these Terms is found invalid or unenforceable, the remaining provisions shall continue in full force and effect. (c) Waiver: Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. (d) Assignment: You may not assign these Terms without our prior written consent. We may assign these Terms without restriction. (e) Force Majeure: We shall not be liable for any delay or failure in performance resulting from causes beyond our reasonable control, including but not limited to acts of God, government actions, FinCEN system outages, internet service disruptions, or pandemics. (f) Notices: All notices to us should be sent to clear@fincenclear.com. Notices to you will be sent to the email address associated with your account.

**Section 17: Contact Information**

If you have questions about these Terms, please contact us at:

PCT FinCEN Solutions  
Email: clear@fincenclear.com  
Website: www.fincenclear.com

---

## TASK 2: Populate Privacy Policy

### File: `web/app/(marketing)/privacy/page.tsx` (or `web/app/privacy/page.tsx`)

Replace the placeholder content with the following Privacy Policy. Same rendering approach — JSX with Tailwind prose classes.

---

### PRIVACY POLICY CONTENT:

**Page title:** Privacy Policy  
**Subtitle:** Last Updated: February 2026  
**Intro paragraph:**

PCT FinCEN Solutions, a wholly-owned subsidiary of Pacific Coast Title Company ("Company," "we," "us," or "our"), is committed to protecting the privacy of users of the FinClear platform (the "Platform"). This Privacy Policy describes how we collect, use, disclose, and protect your information when you use the Platform. By accessing or using the Platform, you consent to the practices described in this Privacy Policy.

**Section 1: Information We Collect**

We collect the following categories of information:

**Account Information:** Name, email address, phone number, company name, job title, and role designation as provided during the account provisioning process.

**Transaction Data:** Information you enter into the Platform related to real estate transactions, including but not limited to: property addresses, purchase prices, closing dates, payment source details, and party identification information (names, addresses, taxpayer identification numbers, dates of birth, and identification documents).

**Beneficial Ownership Information:** Information about individuals who hold ownership interests in entities involved in transactions, including names, addresses, identification numbers, and ownership percentages, as required for FinCEN reporting.

**Filing Data:** Information generated by the Platform in connection with FinCEN filings, including XML data, submission records, receipt identifiers (BSA IDs), filing status, and response data received from FinCEN.

**Usage Data:** Information about how you interact with the Platform, including pages visited, features used, actions taken, timestamps, IP addresses, browser type, device information, and referring URLs.

**Communication Data:** Records of communications between you and our support team, including email correspondence sent to clear@fincenclear.com.

**Section 2: How We Use Your Information**

We use the information we collect for the following purposes:

(a) To operate, maintain, and provide the Platform's functionality, including preparing and transmitting FinCEN filings on your behalf. (b) To process your account and manage your relationship with us. (c) To communicate with you about your account, filings, and Platform updates. (d) To provide customer support and respond to your inquiries. (e) To generate invoices and process payments. (f) To comply with our legal obligations, including recordkeeping requirements. (g) To detect, prevent, and address fraud, security issues, and technical problems. (h) To improve and develop the Platform. (i) To enforce our Terms of Service.

**Section 3: FinCEN Filing Data — Special Handling**

You acknowledge and understand that the core function of the Platform is to prepare and transmit reports to the Financial Crimes Enforcement Network (FinCEN), a bureau of the United States Department of the Treasury. In connection with this function:

(a) **Government Transmission:** Transaction data and beneficial ownership information that you enter into the Platform will be compiled into XML reports and transmitted electronically to FinCEN via Secure Direct Transfer Mode (SDTM) or other approved methods. Once transmitted, this data is in the possession of the United States government and is subject to federal law regarding its use, disclosure, and retention.

(b) **We Are a Conduit:** We act as a technology conduit for the preparation and transmission of your filings. We do not independently use your FinCEN filing data for marketing, advertising, profiling, or any purpose unrelated to the filing service.

(c) **Retention of Filing Records:** We retain copies of filings, submission metadata, and FinCEN response data (including BSA IDs) for compliance, audit, and support purposes. Filing artifacts are stored in encrypted form within our systems.

(d) **Sensitive Data:** Taxpayer Identification Numbers (TINs), Social Security Numbers (SSNs), Employer Identification Numbers (EINs), passport numbers, and dates of birth are collected solely for FinCEN filing purposes. We implement technical safeguards including encryption at rest and in transit, access controls, and audit logging to protect this information.

**Section 4: Information Sharing and Disclosure**

We do not sell your personal information. We may share your information in the following circumstances:

(a) **Government Agencies:** We transmit filing data to FinCEN as directed by you through your use of the Platform. This is the core function of the Platform.

(b) **Service Providers:** We use third-party service providers to assist in operating the Platform, including cloud hosting (Render), email delivery (SendGrid), and PDF generation (PDFShift). These providers are contractually obligated to protect your information and use it only for the purposes of providing services to us.

(c) **Within Our Corporate Family:** We may share information with Pacific Coast Title Company, our parent company, for operational, compliance, and administrative purposes.

(d) **Legal Requirements:** We may disclose information if required by law, regulation, legal process, or governmental request, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.

(e) **Business Transfers:** In the event of a merger, acquisition, or sale of all or a portion of our assets, your information may be transferred as part of that transaction. We will notify you of any such change in ownership or control.

(f) **With Your Consent:** We may share information with third parties when you have given us explicit consent to do so.

**Section 5: Data Security**

We implement commercially reasonable technical and organizational measures to protect your information, including: encryption of data in transit (TLS/SSL) and at rest, access controls and role-based permissions, secure authentication mechanisms, regular security assessments, audit logging of data access and modifications, and encrypted storage of filing artifacts. However, no method of electronic storage or transmission is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.

**Section 6: Data Retention**

We retain your information for as long as your account is active and as needed to provide the Platform's services. Filing records and associated metadata are retained for a minimum of six (6) years from the date of filing, consistent with FinCEN recordkeeping requirements and applicable regulations. After the retention period, data will be securely deleted or anonymized. You may request deletion of your account and non-filing data by contacting us at clear@fincenclear.com, subject to our legal retention obligations.

**Section 7: Your Rights**

Depending on your jurisdiction, you may have the following rights regarding your personal information:

(a) **Access:** Request a copy of the personal information we hold about you. (b) **Correction:** Request correction of inaccurate or incomplete information. (c) **Deletion:** Request deletion of your personal information, subject to our legal retention obligations (including FinCEN recordkeeping requirements). (d) **Restriction:** Request that we restrict processing of your information in certain circumstances. (e) **Portability:** Request a copy of your information in a structured, commonly used format.

To exercise any of these rights, please contact us at clear@fincenclear.com. We will respond to your request within 30 days.

**California Residents (CCPA/CPRA):** California residents have additional rights under the California Consumer Privacy Act, as amended by the California Privacy Rights Act. You have the right to know what personal information we collect, the right to delete your personal information (subject to exceptions), and the right to opt out of the sale of personal information. We do not sell personal information. To submit a request, contact us at clear@fincenclear.com.

**Section 8: Cookies and Tracking**

The Platform uses essential cookies necessary for authentication and session management. We do not use advertising cookies or third-party tracking cookies for marketing purposes. We may use analytics tools to understand Platform usage patterns and improve our services. You may configure your browser to reject cookies, but this may affect Platform functionality.

**Section 9: Children's Privacy**

The Platform is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child under 18, we will take steps to delete that information.

**Section 10: International Users**

The Platform is operated from the United States. If you access the Platform from outside the United States, your information will be transferred to and processed in the United States. By using the Platform, you consent to this transfer.

**Section 11: Third-Party Links**

The Platform may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review the privacy policies of any third-party sites you visit.

**Section 12: Changes to This Policy**

We may update this Privacy Policy from time to time. Material changes will be communicated via email or through a notice on the Platform. Your continued use of the Platform after any changes constitutes your acceptance of the updated Privacy Policy.

**Section 13: Contact Information**

If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:

PCT FinCEN Solutions  
Email: clear@fincenclear.com  
Website: www.fincenclear.com

---

## RENDERING INSTRUCTIONS

For both pages, render the content as clean JSX with:

1. Use Tailwind `prose prose-gray max-w-none` on the content container
2. Each section title as `<h2>` with consistent styling
3. Subsections (like the data categories in Privacy Section 1) as `<h3>` or bold `<p>` tags
4. ALL-CAPS paragraphs (disclaimers, liability, arbitration) should be rendered with `<p className="uppercase text-sm tracking-wide">` or kept as regular paragraphs with the caps preserved — do NOT convert them to lowercase. The caps are intentional legal formatting.
5. Proper spacing between sections
6. Email links as `<a href="mailto:clear@fincenclear.com">clear@fincenclear.com</a>`
7. Link from Terms Section 14 to `/privacy`
8. Link from Privacy intro to `/terms`

Make sure both pages:
- Include the Header and Footer components (use same layout as marketing pages)
- Have proper `<Metadata>` with title and description
- Are mobile-responsive
- Print cleanly (no background colors that interfere with printing)

---

## VERIFICATION

After implementation:

```bash
# Verify pages exist and have content
curl -s http://localhost:3000/terms | head -20
curl -s http://localhost:3000/privacy | head -20

# Verify no placeholder text remains
grep -n "being finalized\|placeholder\|TODO\|TBD" web/app/**/terms/page.tsx web/app/**/privacy/page.tsx
```

Both pages should render fully with all legal content, proper formatting, and working navigation.
