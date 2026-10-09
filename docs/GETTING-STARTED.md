# Getting Started with Career OS

> **For:** New users setting up Career OS for the first time.  
> **Goal:** Go from zero to actively tracking applications in your first week.

This guide walks you through the first-week checklist to get Career OS working for your job search. For detailed operator instructions or local development setup, see [OPERATOR.md](./OPERATOR.md).

---

## Your First 15 Minutes

When you open Career OS with no applications yet, focus on these three steps:

### 1. ✅ Upload and tailor your CV

**Why:** Career OS needs your master CV to suggest tailored versions for each application and calculate ATS match scores.

**How:**
1. Go to **CV Manager** (sidebar or top menu)
2. Click **Upload CV** and select your PDF
3. Wait for the parser to extract your experience, skills, and education
4. Review the **ATS Score** card — it highlights missing keywords and weak spots
5. (Optional) Create a tailored variant for a specific role by clicking **Tailor to Job**

**Time:** ~5 minutes

**Done when:** You see your CV preview in the CV Manager with an ATS score.

---

### 2. ✅ Log your first 3 applications

**Why:** Career OS tracks each application's stage, materials, and next steps. You need at least a few jobs in the pipeline to see the dashboard come alive.

**How:**
1. Go to **Jobs** (sidebar)
2. Click **Add Job**
3. Paste a job URL from LinkedIn, a company careers page, or a job board
4. Career OS will scrape the job description and extract:
   - Company name
   - Role title
   - Key requirements
   - Application deadline (if present)
5. Repeat for 2–3 more jobs you're actively pursuing
6. Each job card shows:
   - **Stage** (Sourced → Applied → Interviewing → Offer / Rejected)
   - **ATS Match** (how well your CV aligns with the JD)
   - **Next Steps** (AI-suggested actions based on your activity)

**Time:** ~5 minutes

**Done when:** You see 3 job cards in the Jobs view or on your Dashboard pipeline.

---

### 3. ✅ Capture interview notes

**Why:** Career OS uses your notes to suggest prep topics, track recurring questions, and build your long-term interview memory. The sooner you start logging, the smarter the suggestions become.

**How:**
1. **After a recruiter call or interview:**
   - Go to **Applications** → select the job
   - Open the **War Room** (right panel)
   - Click **Add Note** or **New Interview**
   - Capture:
     - Who you spoke with
     - Questions they asked
     - Your answers (STAR format recommended)
     - Next steps or red flags
2. **Use the template:**
   - Career OS auto-fills a note template with sections for context, questions, and action items
   - Fill in what you remember; even bullet points help
3. **Tag recurring themes:**
   - Mark questions as "Behavioral," "Technical," "Case study," etc.
   - The app will surface similar questions in **Prep** for practice

**Time:** ~5 minutes per interview

**Done when:** You have at least one interview note logged in a job's War Room.

---

## Bonus: Turn on Live Copilot

Once you have an interview scheduled, enable **Live Copilot** to get real-time answer suggestions during the call:

1. Go to **Settings → Copilot**
2. Grant **Microphone** and **Screen Recording** permissions when prompted (macOS will ask)
3. Before your interview:
   - Open the **Copilot** page
   - Click **Start Session** and select the job
   - The overlay will appear in the corner of your screen (invisible to the recruiter via screen-share masking)
4. During the interview:
   - Copilot transcribes the recruiter's questions in real-time
   - It generates structured answer bullets (STAR / MECE frameworks) contextualized by your CV and the JD
   - Bullets appear in 2–5 seconds
5. After the call:
   - Click **End Session**
   - Review the transcript and export notes to the job's War Room

**Stealth note:** Live Copilot uses macOS ScreenCaptureKit to detect when you're sharing your screen and automatically masks its overlay. However, **you are responsible for disclosing any AI assistance** if your recruiter or company policy requires it. Career OS does not transmit or store raw audio — only transcripts.

---

## Next Steps After Your First Week

Once you've completed the checklist:

- **Explore Prep:** Go to **Prep** to see AI-generated practice questions based on your target roles and interview history.
- **Track your pipeline:** The **Dashboard** shows your active applications, priority tasks, and suggested next actions.
- **Review ATS insights:** Check the **CV Manager → ATS View** to see which keywords you're missing for each job.
- **Add more jobs:** Keep your pipeline full by logging 5–10 applications per week. Career OS will suggest which roles to prioritize.

---

## Troubleshooting

### "My CV didn't parse correctly"

- **Cause:** Some PDF layouts (multi-column, heavy graphics, scanned images) confuse the parser.
- **Fix:** Export your CV as a simpler PDF (single-column, text-based) and re-upload. Docling (the parser) works best with structured text.

### "Job scraping failed"

- **Cause:** Some job boards (Indeed, Glassdoor) block automated scraping or require login.
- **Fix:** Copy/paste the job description manually into the **Add Job** form. Career OS will still extract key details.

### "Copilot overlay is visible during screen share"

- **Cause:** macOS 15+ ignores the old `NSWindow.sharingType = .none` API. Career OS detects screen-sharing and masks the overlay, but some conferencing tools bypass this.
- **Fix:**
  1. Route the Copilot overlay to a second display (Settings → Copilot → Display)
  2. Use a virtual display (like BetterDisplay) if you don't have a physical monitor
  3. Disable Copilot during the call and review the transcript afterward

### "I accidentally denied permissions"

- **Fix:** Open **System Settings → Privacy & Security** → find **Career OS** under Microphone / Screen Recording / Accessibility → toggle it on → restart the app.

---

## What's Not Covered Here

- **Advanced Copilot configuration** (hotkeys, failover models, prompt tuning) → see [Settings documentation](#) (coming soon)
- **Production deployment** (Cloudflare Workers publish, DMG signing) → see [OPERATOR.md](./OPERATOR.md)
- **Local development setup** → see [OPERATOR.md](./OPERATOR.md)

---

**Questions or stuck?** Open a [GitHub issue](https://github.com/Caezarr/career-ops/issues) or see [SUPPORT.md](../SUPPORT.md).
