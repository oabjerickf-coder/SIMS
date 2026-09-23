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
