import nodemailer, { Transporter } from 'nodemailer';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLORS = {
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
};

const baseCard = (content: string) => `
  <div style="
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: ${COLORS.bg};
    padding: 40px 16px;
    min-height: 100vh;
  ">
    <div style="
      max-width: 520px;
      margin: 0 auto;
      background: ${COLORS.card};
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.07);
      border: 1px solid ${COLORS.border};
    ">
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%);
        padding: 32px 40px 28px;
        text-align: center;
      ">
        <div style="
          display: inline-flex;
          align-items: center;
          gap: 10px;
        ">
          <div style="
            width: 40px; height: 40px;
            background: rgba(255,255,255,0.2);
            border-radius: 10px;
            display: flex; align-items: center; justify-content: center;
            font-size: 20px;
          ">🏥</div>
          <span style="
            color: #fff;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.3px;
          ">E-Santé<span style="color:rgba(255,255,255,0.6);font-weight:400;">CI</span></span>
        </div>
      </div>

      <!-- Body -->
      <div style="padding: 36px 40px;">
        ${content}
      </div>

      <!-- Footer -->
      <div style="
        background: ${COLORS.bg};
        border-top: 1px solid ${COLORS.border};
        padding: 20px 40px;
        text-align: center;
      ">
        <p style="margin:0; color:${COLORS.textMuted}; font-size:12px; line-height:1.6;">
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.<br/>
          © ${new Date().getFullYear()} E-SantéCI — Tous droits réservés.
        </p>
      </div>
    </div>
  </div>
`;

const otpBox = (otp: string) => `
  <div style="
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 2px dashed ${COLORS.primary};
    border-radius: 12px;
    padding: 24px;
    text-align: center;
    margin: 24px 0;
  ">
    <p style="margin:0 0 8px; color:${COLORS.textSecondary}; font-size:13px; text-transform:uppercase; letter-spacing:1px;">
      Votre code de vérification
    </p>
    <div style="
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 12px;
      color: ${COLORS.primary};
      font-variant-numeric: tabular-nums;
    ">${otp}</div>
    <p style="margin:10px 0 0; color:${COLORS.textMuted}; font-size:12px;">
      ⏱ Expire dans <strong>10 minutes</strong>
    </p>
  </div>
`;

const ctaButton = (href: string, label: string, color: string = COLORS.primary) => `
  <div style="text-align:center; margin: 28px 0;">
    <a href="${href}" style="
      display: inline-block;
      padding: 14px 32px;
      background: ${color};
      color: #ffffff;
      text-decoration: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.2px;
      box-shadow: 0 4px 12px ${color}55;
      transition: all 0.2s;
    ">${label}</a>
    <p style="margin:12px 0 0; color:${COLORS.textMuted}; font-size:12px;">
      Ou copiez ce lien : <a href="${href}" style="color:${COLORS.primary}; word-break:break-all;">${href}</a>
    </p>
  </div>
`;

const badge = (text: string, color: string) => `
  <span style="
    display: inline-block;
    padding: 3px 10px;
    background: ${color}18;
    color: ${color};
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    border: 1px solid ${color}33;
  ">${text}</span>
`;

const infoRow = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 16px; color:${COLORS.textSecondary}; font-size:14px; border-bottom:1px solid ${COLORS.border};">${label}</td>
    <td style="padding:10px 16px; color:${COLORS.textPrimary}; font-size:14px; font-weight:600; border-bottom:1px solid ${COLORS.border};">${value}</td>
  </tr>
`;

// ─── Mail Service ─────────────────────────────────────────────────────────────

class MailService {
  private transporter: Transporter | null = null;

  private async getTransporter(): Promise<Transporter> {
    if (this.transporter) return this.transporter;

    // ✅ Ethereal : compte de test auto-généré
    const testAccount = await nodemailer.createTestAccount();

    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('\n📧 ─── Ethereal Mail Account ────────────────────');
    console.log(`   User : ${testAccount.user}`);
    console.log(`   Pass : ${testAccount.pass}`);
    console.log(`   Web  : https://ethereal.email\n`);

    return this.transporter;
  }

  private async send(options: MailOptions): Promise<void> {
    const transporter = await this.getTransporter();
    const info = await transporter.sendMail({
      from: '"E-SantéCI 🏥" <noreply@esante.ci>',
      ...options,
    });

    // ✅ Lien de prévisualisation dans le terminal
    const preview = nodemailer.getTestMessageUrl(info);
    console.log(`📨 Email envoyé → ${options.subject}`);
    console.log(`   Preview : ${preview}\n`);
  }

  // ─── OTP ──────────────────────────────────────────────────────────────────

  async sendOtp(to: string, otp: string, role: 'patient' | 'doctor'): Promise<void> {
    const roleLabel = role === 'doctor' ? 'Médecin' : 'Patient';
    const roleBadge = role === 'doctor'
      ? badge('Médecin', COLORS.primary)
      : badge('Patient', COLORS.success);

    await this.send({
      to,
      subject: '🔐 Votre code de vérification – E-SantéCI',
      html: baseCard(`
        <p style="margin:0 0 4px; color:${COLORS.textSecondary}; font-size:13px;">Bonjour ${roleLabel} ${roleBadge}</p>
        <h2 style="margin:8px 0 16px; color:${COLORS.textPrimary}; font-size:22px; font-weight:700;">
          Vérification de votre compte
        </h2>
        <p style="color:${COLORS.textSecondary}; font-size:15px; line-height:1.6; margin:0 0 8px;">
          Utilisez le code ci-dessous pour activer votre compte E-SantéCI.
        </p>
        ${otpBox(otp)}
        <div style="
          background: #fef9ee;
          border-left: 3px solid ${COLORS.warning};
          padding: 12px 16px;
          border-radius: 0 8px 8px 0;
          margin-top: 8px;
        ">
          <p style="margin:0; color:${COLORS.textSecondary}; font-size:13px;">
            ⚠️ Ne partagez jamais ce code. E-SantéCI ne vous le demandera jamais.
          </p>
        </div>
      `),
    });
  }

  // ─── Vérification email ────────────────────────────────────────────────────

  async sendEmailVerification(to: string, verificationLink: string): Promise<void> {
    await this.send({
      to,
      subject: '✉️ Vérifiez votre adresse email – E-SantéCI',
      html: baseCard(`
        <h2 style="margin:0 0 12px; color:${COLORS.textPrimary}; font-size:22px; font-weight:700;">
          Confirmez votre email
        </h2>
        <p style="color:${COLORS.textSecondary}; font-size:15px; line-height:1.6; margin:0 0 8px;">
          Merci de vous être inscrit sur <strong>E-SantéCI</strong>. 
          Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.
        </p>
        ${ctaButton(verificationLink, '✅ Vérifier mon email')}
        <p style="color:${COLORS.textMuted}; font-size:13px; text-align:center; margin:0;">
          Ce lien expire dans <strong>24 heures</strong>. 
          Si vous n'avez pas créé de compte, ignorez cet email.
        </p>
      `),
    });
  }

  // ─── Reset mot de passe ────────────────────────────────────────────────────

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    await this.send({
      to,
      subject: '🔑 Réinitialisation de mot de passe – E-SantéCI',
      html: baseCard(`
        <h2 style="margin:0 0 12px; color:${COLORS.textPrimary}; font-size:22px; font-weight:700;">
          Réinitialiser votre mot de passe
        </h2>
        <p style="color:${COLORS.textSecondary}; font-size:15px; line-height:1.6; margin:0 0 8px;">
          Vous avez demandé à réinitialiser votre mot de passe. 
          Ce lien est valable <strong>1 heure</strong>.
        </p>
        ${ctaButton(resetLink, '🔑 Réinitialiser mon mot de passe', COLORS.danger)}
        <div style="
          background: #fff5f5;
          border-left: 3px solid ${COLORS.danger};
          padding: 12px 16px;
          border-radius: 0 8px 8px 0;
          margin-top: 8px;
        ">
          <p style="margin:0; color:${COLORS.textSecondary}; font-size:13px;">
            🚨 Si vous n'êtes pas à l'origine de cette demande, ignorez cet email. 
            Votre mot de passe restera inchangé.
          </p>
        </div>
      `),
    });
  }

  // ─── Bienvenue ─────────────────────────────────────────────────────────────

  async sendWelcome(to: string, firstName: string, role: 'patient' | 'doctor'): Promise<void> {
    const isDoctor = role === 'doctor';
    const roleLabel = isDoctor ? 'médecin' : 'patient';
    const accentColor = isDoctor ? COLORS.primary : COLORS.success;
    const nextStep = isDoctor
      ? 'Configurez votre profil professionnel et commencez à recevoir des patients.'
      : 'Trouvez un médecin et prenez votre premier rendez-vous en quelques clics.';

    await this.send({
      to,
      subject: `🎉 Bienvenue sur E-SantéCI, ${firstName} !`,
      html: baseCard(`
        <div style="text-align:center; margin-bottom:28px;">
          <div style="
            width: 72px; height: 72px;
            background: linear-gradient(135deg, ${accentColor}22, ${accentColor}44);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            margin-bottom: 16px;
          ">${isDoctor ? '👨‍⚕️' : '🙋'}</div>
          <h2 style="margin:0 0 6px; color:${COLORS.textPrimary}; font-size:24px; font-weight:700;">
            Bienvenue, ${firstName} ! 
          </h2>
          <p style="margin:0; color:${COLORS.textSecondary}; font-size:14px;">
            Votre compte ${badge(roleLabel, accentColor)} est activé avec succès.
          </p>
        </div>

        <div style="
          background: ${COLORS.bg};
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 24px;
        ">
          <p style="margin:0 0 8px; color:${COLORS.textPrimary}; font-size:15px; font-weight:600;">
            Prochaine étape
          </p>
          <p style="margin:0; color:${COLORS.textSecondary}; font-size:14px; line-height:1.6;">
            ${nextStep}
          </p>
        </div>

        <p style="margin:0; color:${COLORS.textMuted}; font-size:13px; text-align:center; line-height:1.6;">
          Besoin d'aide ? Contactez-nous à 
          <a href="mailto:support@esante.ci" style="color:${COLORS.primary};">support@esante.ci</a>
        </p>
      `),
    });
  }

  // ─── Confirmation rendez-vous ──────────────────────────────────────────────

  async sendAppointmentConfirmation(
    to: string,
    firstName: string,
    details: { doctorName: string; date: string; type: string }
  ): Promise<void> {
    await this.send({
      to,
      subject: 'Rendez-vous confirmé – E-SantéCI',
      html: baseCard(`
        <div style="
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 20px 24px;
          text-align: center;
          margin-bottom: 24px;
        ">
          <div style="font-size:36px; margin-bottom:8px;">✅</div>
          <h2 style="margin:0; color:${COLORS.success}; font-size:20px; font-weight:700;">
            Rendez-vous confirmé !
          </h2>
        </div>

        <p style="color:${COLORS.textSecondary}; font-size:15px; margin:0 0 20px;">
          Bonjour <strong>${firstName}</strong>, votre rendez-vous a bien été enregistré.
        </p>

        <table style="width:100%; border-collapse:collapse; border-radius:10px; overflow:hidden; border:1px solid ${COLORS.border};">
          ${infoRow('Médecin', details.doctorName)}
          ${infoRow('Date', details.date)}
          ${infoRow('Type', details.type)}
        </table>

        <div style="
          background: #f0f9ff;
          border-left: 3px solid ${COLORS.primary};
          padding: 12px 16px;
          border-radius: 0 8px 8px 0;
          margin-top: 20px;
        ">
          <p style="margin:0; color:${COLORS.textSecondary}; font-size:13px;">
            Pensez à vous présenter 10 minutes avant votre rendez-vous.
          </p>
        </div>
      `),
    });
  }
}

export const mailService = new MailService();