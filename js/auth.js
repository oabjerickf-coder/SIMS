const form = document.getElementById('authForm');
const errorBox = document.getElementById('errorBox');
const submitBtn = document.getElementById('submitBtn');
const switchBtn = document.getElementById('switchBtn');
const switchText = document.getElementById('switchText');
const modeSubtitle = document.getElementById('modeSubtitle');
const signupFields = document.getElementById('signupFields');
const roleSelect = document.getElementById('role');
const studentOnlyFields = document.getElementById('studentOnlyFields');
const forgotWrap = document.getElementById('forgotWrap');
const forgotPassBtn = document.getElementById('forgotPassBtn');

let mode = 'login'; // or 'signup'

// If already logged in, skip straight to the dashboard
(async () => {
  if (!supabaseClient) return;
  try {
    const { data } = await supabaseClient.auth.getSession();
    if (data?.session) {
      // Check if teacher is approved before redirecting
      const approved = await isTeacherApproved(data.session.user.id);
      if (approved === false) {
        await supabaseClient.auth.signOut();
        return;
      }
      window.location.href = 'dashboard.html';
    }
  } catch (err) {
    console.error('Session check failed:', err);
  }
})();

switchBtn.addEventListener('click', () => {
  mode = mode === 'login' ? 'signup' : 'login';
  const isSignup = mode === 'signup';

  signupFields.classList.toggle('show', isSignup);
  if (forgotWrap) forgotWrap.style.display = isSignup ? 'none' : 'flex';
  submitBtn.textContent = isSignup ? 'Create account' : 'Login';
  modeSubtitle.textContent = isSignup ? 'Create your account' : 'Sign in to continue';
  switchText.textContent = isSignup ? 'Already have an account?' : "Don't have an account?";
  switchBtn.textContent = isSignup ? 'Sign in' : 'Create one';
  hideError();
});

roleSelect.addEventListener('change', () => {
  studentOnlyFields.style.display = roleSelect.value === 'student' ? 'block' : 'none';
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.add('show');
  errorBox.style.color = '';
}
function hideError() {
  errorBox.classList.remove('show');
  errorBox.style.color = '';
}

/**
 * Returns true if user is not a teacher or is an approved teacher.
 * Returns false only if user is a teacher and NOT approved.
 */
async function isTeacherApproved(userId) {
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile || profile.role !== 'teacher') return true; // not a teacher, allow

  const { data: teacher } = await supabaseClient
    .from('teachers')
    .select('approved')
    .eq('id', userId)
    .single();

  return teacher?.approved === true;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  if (!supabaseClient) {
    showError('Hindi makakonekta sa database. Pakisuri ang iyong koneksyon sa internet.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = mode === 'signup' ? 'Creating account…' : 'Signing in…';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    if (mode === 'signup') {
      const fullName = document.getElementById('fullName').value.trim();
      const role = roleSelect.value;
      const rollNo = document.getElementById('rollNo').value.trim();

      if (!fullName) throw new Error('Please enter your full name.');

      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            roll_no: rollNo,
            class_name: rollNo
          }
        }
      });
      if (error) throw error;

      if (role === 'teacher') {
        showError('Account created! Your teacher account is pending admin approval. You will be able to log in once approved.');
      } else {
        showError('Account created! You can now sign in.');
      }
      errorBox.style.color = '#bfe8c8';

    } else {
      const { data: signInData, error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        throw new Error('Login failed: ' + error.message + '. Please try again.');
      }

      // Check if teacher is approved
      const approved = await isTeacherApproved(signInData.user.id);
      if (approved === false) {
        await supabaseClient.auth.signOut();
        throw new Error('Your teacher account is pending admin approval. Please wait for the admin to approve your registration.');
      }

      window.location.href = 'dashboard.html';
      return;
    }
  } catch (err) {
    showError(err.message || 'Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Login';
  }
});

/* ============================================================
   FORGOT PASSWORD & 6-DIGIT OTP VERIFICATION
   ============================================================ */
const forgotModal = document.getElementById('forgotModal');
const forgotModalTitle = document.getElementById('forgotModalTitle');
const forgotEmail = document.getElementById('forgotEmail');
const forgotErrorBox = document.getElementById('forgotErrorBox');
const forgotStep1 = document.getElementById('forgotStep1');
const forgotStep2 = document.getElementById('forgotStep2');
const forgotStep3 = document.getElementById('forgotStep3');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');
const resetPassBtn = document.getElementById('resetPassBtn');
const resendOtpBtn = document.getElementById('resendOtpBtn');
const changeEmailStepBtn = document.getElementById('changeEmailStepBtn');
const sentEmailDisplay = document.getElementById('sentEmailDisplay');
const otpCodeInput = document.getElementById('otpCodeInput');
const forgotNewPass = document.getElementById('forgotNewPass');
const forgotConfirmPass = document.getElementById('forgotConfirmPass');

let resendTimer = null;
let resendSeconds = 60;
let targetEmail = '';

function showForgotError(msg) {
  if (forgotErrorBox) {
    forgotErrorBox.textContent = msg;
    forgotErrorBox.classList.add('show');
  }
}

function hideForgotError() {
  if (forgotErrorBox) {
    forgotErrorBox.classList.remove('show');
  }
}

function openForgotModal() {
  hideForgotError();
  const currentEmail = document.getElementById('email').value.trim();
  if (currentEmail) forgotEmail.value = currentEmail;

  if (forgotModalTitle) forgotModalTitle.textContent = 'Reset password';
  forgotStep1.style.display = 'block';
  forgotStep2.style.display = 'none';
  forgotStep3.style.display = 'none';
  if (forgotModal) forgotModal.style.display = 'flex';
  setTimeout(() => forgotEmail?.focus(), 100);
}

function closeForgotModal() {
  if (forgotModal) forgotModal.style.display = 'none';
  clearInterval(resendTimer);
  hideForgotError();
}
window.closeForgotModal = closeForgotModal;

forgotPassBtn?.addEventListener('click', openForgotModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeForgotModal();
});

// Step 1: Send 6-digit OTP code to email
sendOtpBtn?.addEventListener('click', async () => {
  const email = forgotEmail.value.trim();
  if (!email) {
    showForgotError('Please enter your verified email address.');
    return;
  }

  hideForgotError();
  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = 'Sending 6-digit code…';

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if (error) throw error;

    targetEmail = email;
    if (sentEmailDisplay) sentEmailDisplay.textContent = email;
    if (forgotModalTitle) forgotModalTitle.textContent = 'Verify OTP code';
    forgotStep1.style.display = 'none';
    forgotStep2.style.display = 'block';
    forgotStep3.style.display = 'none';
    otpCodeInput.value = '';
    setTimeout(() => otpCodeInput?.focus(), 100);

    startResendCountdown();
  } catch (err) {
    console.error('Send OTP error:', err);
    showForgotError(err.message || 'Failed to send OTP code. Please check the email and try again.');
  } finally {
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = 'Send 6-digit code';
  }
});

function startResendCountdown() {
  resendSeconds = 60;
  resendOtpBtn.disabled = true;
  resendOtpBtn.style.opacity = '0.5';
  clearInterval(resendTimer);
  resendOtpBtn.textContent = `Resend code (${resendSeconds}s)`;

  resendTimer = setInterval(() => {
    resendSeconds--;
    if (resendSeconds <= 0) {
      clearInterval(resendTimer);
      resendOtpBtn.disabled = false;
      resendOtpBtn.style.opacity = '1';
      resendOtpBtn.textContent = 'Resend code';
    } else {
      resendOtpBtn.textContent = `Resend code (${resendSeconds}s)`;
    }
  }, 1000);
}

resendOtpBtn?.addEventListener('click', async () => {
  if (resendSeconds > 0) return;
  hideForgotError();
  resendOtpBtn.disabled = true;
  resendOtpBtn.textContent = 'Resending…';

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(targetEmail);
    if (error) throw error;
    startResendCountdown();
  } catch (err) {
    showForgotError(err.message || 'Failed to resend code.');
    resendOtpBtn.disabled = false;
    resendOtpBtn.textContent = 'Resend code';
  }
});

changeEmailStepBtn?.addEventListener('click', () => {
  clearInterval(resendTimer);
  hideForgotError();
  if (forgotModalTitle) forgotModalTitle.textContent = 'Reset password';
  forgotStep2.style.display = 'none';
  forgotStep3.style.display = 'none';
  forgotStep1.style.display = 'block';
  forgotEmail.focus();
});

// Step 2: Verify 6-digit OTP code ONLY (Password fields are hidden until this succeeds)
verifyOtpBtn?.addEventListener('click', async () => {
  const code = otpCodeInput.value.trim();

  if (!code || code.length < 6) {
    showForgotError('Please enter the complete 6-digit OTP verification code.');
    return;
  }

  hideForgotError();
  verifyOtpBtn.disabled = true;
  verifyOtpBtn.textContent = 'Verifying code…';

  try {
    // Verify 6-digit OTP code with Supabase
    let verifyRes = await supabaseClient.auth.verifyOtp({
      email: targetEmail,
      token: code,
      type: 'recovery'
    });

    if (verifyRes.error) {
      verifyRes = await supabaseClient.auth.verifyOtp({
        email: targetEmail,
        token: code,
        type: 'email'
      });
    }

    if (verifyRes.error) {
      throw new Error('Invalid or expired 6-digit OTP code. Please check your Gmail or request a new code.');
    }

    // OTP Verified successfully! Now reveal password fields
    if (forgotModalTitle) forgotModalTitle.textContent = 'Create new password';
    forgotStep2.style.display = 'none';
    forgotStep3.style.display = 'block';
    forgotNewPass.value = '';
    forgotConfirmPass.value = '';
    setTimeout(() => forgotNewPass?.focus(), 100);

  } catch (err) {
    console.error('OTP verification failed:', err);
    showForgotError(err.message || 'Invalid 6-digit OTP code.');
  } finally {
    verifyOtpBtn.disabled = false;
    verifyOtpBtn.textContent = 'Verify Code';
  }
});

// Step 3: Set New Password (Only runs after OTP has been verified)
resetPassBtn?.addEventListener('click', async () => {
  const newPass = forgotNewPass.value;
  const confirmPass = forgotConfirmPass.value;

  if (newPass.length < 6) {
    showForgotError('New password must be at least 6 characters long.');
    return;
  }
  if (newPass !== confirmPass) {
    showForgotError('Passwords do not match. Please re-enter.');
    return;
  }

  hideForgotError();
  resetPassBtn.disabled = true;
  resetPassBtn.textContent = 'Updating password…';

  try {
    const { error: updateErr } = await supabaseClient.auth.updateUser({
      password: newPass
    });
    if (updateErr) throw updateErr;

    // Clean sign out so user logs in with new credentials
    await supabaseClient.auth.signOut();

    closeForgotModal();

    // Fill login form and display success message
    document.getElementById('email').value = targetEmail;
    document.getElementById('password').value = '';
    showError('Password reset successful! You can now log in with your new password.');
    errorBox.style.color = '#bfe8c8';

  } catch (err) {
    console.error('Password reset failed:', err);
    showForgotError(err.message || 'Failed to update password. Please try again.');
  } finally {
    resetPassBtn.disabled = false;
    resetPassBtn.textContent = 'Set New Password';
  }
});
