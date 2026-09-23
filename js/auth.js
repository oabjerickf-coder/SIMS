const form = document.getElementById('authForm');
const errorBox = document.getElementById('errorBox');
const submitBtn = document.getElementById('submitBtn');
const switchBtn = document.getElementById('switchBtn');
const switchText = document.getElementById('switchText');
const modeSubtitle = document.getElementById('modeSubtitle');
const signupFields = document.getElementById('signupFields');
const roleSelect = document.getElementById('role');
const studentOnlyFields = document.getElementById('studentOnlyFields');

let mode = 'login'; // or 'signup'

// If already logged in, skip straight to the dashboard
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) window.location.href = 'dashboard.html';
})();

switchBtn.addEventListener('click', () => {
  mode = mode === 'login' ? 'signup' : 'login';
  const isSignup = mode === 'signup';

  signupFields.classList.toggle('show', isSignup);
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
}
function hideError() {
  errorBox.classList.remove('show');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();
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

      showError('Account created. Check your email to confirm, then sign in.');
      errorBox.style.color = '#bfe8c8';

    } else {
      // ----- "Login successful?" decision from the flowchart -----
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        // NO branch → "try again"
        throw new Error('Login failed: ' + error.message + '. Please try again.');
      }
      // YES branch → select role happens automatically on the dashboard,
      // based on the role stored in the profile.
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
