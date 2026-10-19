let currentUser = null;
let currentProfile = null;
let currentActiveView = null;
let realtimeChannel = null;

const NAV_BY_ROLE = {
  student: [
    { id: 'view_grade', label: 'View grade' },
    { id: 'view_profile', label: 'View profile' }
  ],
  teacher: [
    { id: 'view_profile', label: 'View profile' },
    { id: 'enter_grades', label: 'Enter grades' },
    { id: 'update_grade', label: 'Update grade' }
  ],
  admin: [
    { id: 'manage_student', label: 'Manage student' },
    { id: 'approve_teachers', label: 'Approve teachers' },
    { id: 'generate_report', label: 'Generate report' },
    { id: 'post_announcement', label: 'Post announcement' },
    { id: 'view_profile', label: 'My profile' }
  ]
};

const PAGE_META = {
  view_grade: ['My grades', 'A record of everything your teachers have entered.'],
  view_profile: ['My profile', 'Your account details on record.'],
  enter_grades: ['Enter grades', 'Add a grade for one of your students.'],
  update_grade: ['Update grade', 'Edit grades already on file.'],
  manage_student: ['Manage students', 'Everyone currently enrolled.'],
  approve_teachers: ['Approve teachers', 'Review and approve new teacher registrations.'],
  generate_report: ['Generate report', 'A full export of grades across the system.'],
  post_announcement: ['Post announcement', 'Send announcements to teachers and students.']
};

init();

async function init() {
  if (!supabaseClient) {
    const loader = document.getElementById('loader');
    if (loader) loader.textContent = 'Hindi makakonekta sa Supabase. Pakisuri ang iyong koneksyon sa internet.';
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = 'index.html';
    return;
  }
  currentUser = data.session.user;

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error || !profile) {
    toast('Could not load your profile. Please sign in again.', 'err');
    setTimeout(() => supabaseClient.auth.signOut().then(() => window.location.href = 'index.html'), 1500);
    return;
  }
  currentProfile = profile;

  // Block unapproved teachers from dashboard (with realtime listener)
  if (profile.role === 'teacher') {
    const { data: teacher } = await supabaseClient
      .from('teachers')
      .select('approved')
      .eq('id', currentUser.id)
      .single();

    if (!teacher || teacher.approved !== true) {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.innerHTML = `
          <div style="text-align:center;max-width:420px;padding:24px;">
            <div style="margin-bottom:16px;">
              <span class="realtime-status-pill connecting" style="display:inline-flex;">
                <span class="realtime-dot"></span>
                <span>Naghihintay ng Approval (Live)</span>
              </span>
            </div>
            <h2 style="font-family:var(--serif);margin-bottom:12px;font-size:24px;">Pending Approval</h2>
            <p style="color:var(--text-muted);margin-bottom:24px;line-height:1.5;">Ang iyong teacher account ay naghihintay ng approval mula sa Admin. Awtomatikong magbubukas ang iyong dashboard kapag naaprubahan na nang hindi kailangang mag-refresh.</p>
            <button class="btn btn-ghost" onclick="supabaseClient.auth.signOut().then(()=>window.location.href='index.html')" style="width:auto;padding:10px 22px;">Back to Login</button>
          </div>`;
      }
      setupPendingTeacherRealtime(currentUser.id);
      return;
    }
  }

  document.getElementById('whoName').textContent = profile.full_name;
  document.getElementById('whoRole').textContent = profile.role;
  updateAvatarDisplay(profile.avatar_url, profile.full_name);

  buildNav(profile.role);

  // Show notification bell for students and teachers
  if (profile.role === 'student' || profile.role === 'teacher') {
    setupNotificationBell();
  }

  document.getElementById('loader').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';

  // Setup live realtime subscriptions across all database tables
  setupRealtimeSubscriptions();

  document.getElementById('sidebarWhoCard')?.addEventListener('click', () => {
    showView('view_profile');
  });

  document.getElementById('logoutBtn')?.addEventListener('click', logout);
  document.getElementById('enterGradeForm')?.addEventListener('submit', handleEnterGrade);
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportCsv);
  document.getElementById('announcementForm')?.addEventListener('submit', handlePostAnnouncement);
  document.getElementById('profileForm')?.addEventListener('submit', handleSaveProfile);
  document.getElementById('passwordForm')?.addEventListener('submit', handleChangePassword);
  document.getElementById('chooseAvatarBtn')?.addEventListener('click', () => {
    document.getElementById('avatarFileInput')?.click();
  });
  document.getElementById('avatarFileInput')?.addEventListener('change', handleAvatarUpload);
  document.getElementById('removeAvatarBtn')?.addEventListener('click', handleRemoveAvatar);
}

function buildNav(role) {
  const items = NAV_BY_ROLE[role] || [];
  const navList = document.getElementById('navList');
  navList.innerHTML = '';

  items.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.innerHTML = `<span class="dot"></span> ${item.label}`;
    btn.dataset.view = item.id;
    btn.addEventListener('click', () => showView(item.id));
    navList.appendChild(btn);
  });

  if (items.length) showView(items[0].id);
}

function showView(viewId) {
  currentActiveView = viewId;

  document.querySelectorAll('.nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.view === viewId)
  );
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('active', v.id === 'view-' + viewId)
  );

  const meta = PAGE_META[viewId];
  if (meta) {
    document.getElementById('pageTitle').textContent = meta[0];
    document.getElementById('pageSub').textContent = meta[1];
  }

  const loaders = {
    view_grade: loadStudentGrades,
    view_profile: loadProfileView,
    enter_grades: loadEnterGradesForm,
    update_grade: loadUpdateGrades,
    manage_student: loadManageStudents,
    approve_teachers: loadApproveTeachers,
    generate_report: loadReport,
    post_announcement: loadPostedAnnouncements
  };
  if (loaders[viewId]) loaders[viewId]();
}

async function logout() {
  if (realtimeChannel) {
    try {
      supabaseClient.removeChannel(realtimeChannel);
      realtimeChannel = null;
    } catch (err) {
      console.warn('Error removing realtime channel:', err);
    }
  }
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

/* ============== NOTIFICATION BELL (student + teacher) ============== */
function setupNotificationBell() {
  const bell = document.getElementById('notifBell');
  bell.style.display = 'flex';

  bell.addEventListener('click', openAnnouncementsModal);

  // Check for new announcements
  updateNotifBadge();
}

async function updateNotifBadge() {
  const badge = document.getElementById('notifBadge');
  const lastSeen = localStorage.getItem('sims_last_seen_announcement') || '1970-01-01';

  const { count, error } = await supabaseClient
    .from('announcements')
    .select('id', { count: 'exact', head: true })
    .gt('created_at', lastSeen);

  if (!error && count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function closeAnnouncementsModal() {
  const modal = document.getElementById('announcementsModal');
  if (modal) modal.style.display = 'none';
}
window.closeAnnouncementsModal = closeAnnouncementsModal;

function setupAnnouncementsModalEvents() {
  const closeBtn = document.getElementById('closeAnnouncementsModal');
  if (closeBtn) closeBtn.onclick = closeAnnouncementsModal;

  const modal = document.getElementById('announcementsModal');
  if (modal) {
    modal.onclick = (e) => {
      if (e.target === modal) closeAnnouncementsModal();
    };
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAnnouncementsModal();
  });
}

// Bind modal events right away
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAnnouncementsModalEvents);
} else {
  setupAnnouncementsModalEvents();
}

async function openAnnouncementsModal() {
  const modal = document.getElementById('announcementsModal');
  const body = document.getElementById('announcementsModalBody');
  const empty = document.getElementById('announcementsModalEmpty');
  if (!modal) return;
  modal.style.display = 'flex';

  setupAnnouncementsModalEvents();

  if (body) {
    body.querySelectorAll('.announcement-card, .load-error, .load-spin').forEach(el => el.remove());
    const loadingP = document.createElement('p');
    loadingP.className = 'load-spin';
    loadingP.style.cssText = 'color:var(--text-muted);text-align:center;padding:24px;';
    loadingP.textContent = 'Loading announcements…';
    body.prepend(loadingP);
  }
  if (empty) empty.style.display = 'none';

  try {
    let announcements = [];
    const res = await supabaseClient
      .from('announcements')
      .select('id, title, body, created_at, profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (res.error) {
      console.warn('Query with profiles failed, attempting fallback query:', res.error);
      const fallback = await supabaseClient
        .from('announcements')
        .select('id, title, body, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (fallback.error) throw fallback.error;
      announcements = fallback.data || [];
    } else {
      announcements = res.data || [];
    }

    if (body) {
      body.querySelectorAll('.load-spin, .load-error').forEach(el => el.remove());
    }

    if (!announcements.length) {
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';
      announcements.forEach(ann => {
        const card = document.createElement('div');
        card.className = 'announcement-card';
        card.dataset.annId = ann.id;
        card.innerHTML = `
          <div class="announcement-header">
            <h4>${escapeHtml(ann.title)}</h4>
            <span class="announcement-date">${formatDate(ann.created_at)}</span>
          </div>
          <p class="announcement-body">${escapeHtml(ann.body)}</p>
          <p class="announcement-author">— ${escapeHtml(ann.profiles?.full_name || 'Admin')}</p>`;
        body.appendChild(card);
      });
    }

    // Mark as seen
    localStorage.setItem('sims_last_seen_announcement', new Date().toISOString());
    const badge = document.getElementById('notifBadge');
    if (badge) badge.style.display = 'none';

  } catch (err) {
    console.error('Error loading announcements:', err);
    if (body) {
      body.querySelectorAll('.load-spin').forEach(el => el.remove());
      const errP = document.createElement('p');
      errP.className = 'load-error';
      errP.style.cssText = 'color:var(--error);text-align:center;padding:24px;';
      errP.textContent = 'Could not load announcements. Please check back later.';
      body.appendChild(errP);
    }
  }
}

/* ============== STUDENT: View grade ============== */
async function loadStudentGrades(highlightSubject = null) {
  const { data, error } = await supabaseClient
    .from('grades')
    .select('subject, term, grade, updated_at')
    .eq('student_id', currentUser.id)
    .order('updated_at', { ascending: false });

  const body = document.getElementById('studentGradesBody');
  const empty = document.getElementById('studentGradesEmpty');
  if (!body) return;
  body.innerHTML = '';

  if (error) { toast('Could not load grades.', 'err'); return; }
  if (!data || !data.length) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';

  data.forEach(row => {
    const tr = document.createElement('tr');
    if (highlightSubject && row.subject === highlightSubject) {
      tr.className = 'row-highlight';
    }
    tr.innerHTML = `
      <td>${escapeHtml(row.subject)}</td>
      <td>${escapeHtml(row.term)}</td>
      <td>${gradeBadge(row.grade)}</td>
      <td>${formatDate(row.updated_at)}</td>`;
    body.appendChild(tr);
  });
}

/* ============== View profile (student + teacher + admin) ============== */
async function loadProfileView() {
  document.getElementById('profFullName').value = currentProfile.full_name || '';
  document.getElementById('profEmail').value = currentProfile.email || '';
  document.getElementById('profRole').value = currentProfile.role || '';
  updateAvatarDisplay(currentProfile.avatar_url, currentProfile.full_name);

  const wrap1 = document.getElementById('profExtraWrap1');
  const wrap2 = document.getElementById('profExtraWrap2');
  const wrap3 = document.getElementById('profExtraWrap3');

  if (currentProfile.role === 'student') {
    const { data } = await supabaseClient
      .from('students')
      .select('roll_no, class_name, guardian_contact')
      .eq('id', currentUser.id)
      .single();

    wrap1.style.display = 'block';
    document.getElementById('profExtraLabel1').textContent = 'Student ID';
    document.getElementById('profExtra1').value = data?.roll_no || '';
    document.getElementById('profExtra1').placeholder = 'e.g. 2401010100';

    wrap2.style.display = 'block';
    document.getElementById('profExtraLabel2').textContent = 'Class / Section';
    document.getElementById('profExtra2').value = data?.class_name || '';
    document.getElementById('profExtra2').placeholder = 'e.g. 10-A';

    wrap3.style.display = 'block';
    document.getElementById('profExtraLabel3').textContent = 'Guardian contact';
    document.getElementById('profExtra3').value = data?.guardian_contact || '';
    document.getElementById('profExtra3').placeholder = 'e.g. 09123456789';

  } else if (currentProfile.role === 'teacher') {
    const { data } = await supabaseClient
      .from('teachers')
      .select('subject_specialty')
      .eq('id', currentUser.id)
      .single();

    wrap1.style.display = 'block';
    document.getElementById('profExtraLabel1').textContent = 'Subject specialty';
    document.getElementById('profExtra1').value = data?.subject_specialty || '';
    document.getElementById('profExtra1').placeholder = 'e.g. Science / Mathematics';

    wrap2.style.display = 'none';
    wrap3.style.display = 'none';

  } else {
    // Admin
    wrap1.style.display = 'none';
    wrap2.style.display = 'none';
    wrap3.style.display = 'none';
  }
}

async function handleSaveProfile(e) {
  e.preventDefault();
  const btn = document.getElementById('saveProfileBtn');
  const statusEl = document.getElementById('profileStatus');
  const fullName = document.getElementById('profFullName').value.trim();

  if (!fullName) {
    toast('Please enter your full name.', 'err');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Saving…';
  if (statusEl) statusEl.textContent = '';

  try {
    // 1. Update profiles table
    const { error: profErr } = await supabaseClient
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', currentUser.id);

    if (profErr) throw profErr;

    // Update in-memory profile and sidebar badge immediately
    currentProfile.full_name = fullName;
    const whoNameEl = document.getElementById('whoName');
    if (whoNameEl) whoNameEl.textContent = fullName;
    updateAvatarDisplay(currentProfile.avatar_url, fullName);

    // 2. Role specific updates
    if (currentProfile.role === 'student') {
      const rollNo = document.getElementById('profExtra1').value.trim();
      const className = document.getElementById('profExtra2').value.trim();
      const guardianContact = document.getElementById('profExtra3').value.trim();

      const studentPayload = {
        roll_no: rollNo || null,
        class_name: className || null,
        guardian_contact: guardianContact || null
      };

      const { data: updated, error: studentErr } = await supabaseClient
        .from('students')
        .update(studentPayload)
        .eq('id', currentUser.id)
        .select();

      if (studentErr) throw studentErr;

      // If row didn't exist yet, insert it
      if (!updated || updated.length === 0) {
        const { error: insertErr } = await supabaseClient
          .from('students')
          .insert({
            id: currentUser.id,
            ...studentPayload
          });
        if (insertErr) throw insertErr;
      }

    } else if (currentProfile.role === 'teacher') {
      const subjectSpecialty = document.getElementById('profExtra1').value.trim();

      const teacherPayload = {
        subject_specialty: subjectSpecialty || null
      };

      const { data: updated, error: teacherErr } = await supabaseClient
        .from('teachers')
        .update(teacherPayload)
        .eq('id', currentUser.id)
        .select();

      if (teacherErr) throw teacherErr;

      // If row didn't exist yet, insert it
      if (!updated || updated.length === 0) {
        const { error: insertErr } = await supabaseClient
          .from('teachers')
          .insert({
            id: currentUser.id,
            ...teacherPayload
          });
        if (insertErr) throw insertErr;
      }
    }

    toast('Profile updated successfully!', 'ok');
    if (statusEl) {
      statusEl.textContent = 'Saved successfully.';
      statusEl.style.color = '#74c686';
      setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
    }

  } catch (err) {
    console.error('Failed to update profile:', err);
    toast('Failed to save profile: ' + (err.message || 'Unknown error'), 'err');
    if (statusEl) {
      statusEl.textContent = 'Error saving profile.';
      statusEl.style.color = '#ef4444';
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save changes';
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const btn = document.getElementById('changePasswordBtn');
  const newPass = document.getElementById('newPassword').value;
  const confPass = document.getElementById('confirmPassword').value;

  if (newPass.length < 6) {
    toast('Password must be at least 6 characters long.', 'err');
    return;
  }
  if (newPass !== confPass) {
    toast('Passwords do not match.', 'err');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Updating password…';

  try {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPass
    });
    if (error) throw error;

    toast('Password changed successfully!', 'ok');
    document.getElementById('passwordForm').reset();
  } catch (err) {
    console.error('Failed to change password:', err);
    toast('Failed to change password: ' + (err.message || 'Unknown error'), 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update password';
  }
}

/* ============== AVATAR (PNG Upload & Display) ============== */
function updateAvatarDisplay(avatarUrl, fullName) {
  const initial = (fullName || 'U').trim().charAt(0).toUpperCase() || 'U';

  // 1. Sidebar avatar
  const whoImg = document.getElementById('whoAvatarImg');
  const whoInit = document.getElementById('whoAvatarInitial');
  if (whoImg && whoInit) {
    if (avatarUrl) {
      whoImg.src = avatarUrl;
      whoImg.style.display = 'block';
      whoInit.style.display = 'none';
    } else {
      whoImg.style.display = 'none';
      whoInit.textContent = initial;
      whoInit.style.display = 'block';
    }
  }

  // 2. Profile view avatar
  const profImg = document.getElementById('profAvatarImg');
  const profInit = document.getElementById('profAvatarInitial');
  const removeBtn = document.getElementById('removeAvatarBtn');
  if (profImg && profInit) {
    if (avatarUrl) {
      profImg.src = avatarUrl;
      profImg.style.display = 'block';
      profInit.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'inline-block';
    } else {
      profImg.style.display = 'none';
      profInit.textContent = initial;
      profInit.style.display = 'block';
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }
}

async function handleAvatarUpload(e) {
  const file = e.target.files?.[0];
  if (!file) return;

  // Strict PNG validation
  const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
  if (!isPng) {
    toast('PNG images only! Please select a valid .png file.', 'err');
    e.target.value = '';
    return;
  }

  // Size limit (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    toast('Image is too large. Maximum size is 2MB.', 'err');
    e.target.value = '';
    return;
  }

  const statusEl = document.getElementById('avatarUploadStatus');
  if (statusEl) {
    statusEl.textContent = 'Processing PNG image…';
    statusEl.style.color = 'var(--text-muted)';
  }

  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = async () => {
      try {
        // Optimize and crop to square 200x200 PNG using HTML5 Canvas
        const canvas = document.createElement('canvas');
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const pngDataUrl = canvas.toDataURL('image/png');

        if (statusEl) statusEl.textContent = 'Saving profile photo…';

        const { error } = await supabaseClient
          .from('profiles')
          .update({ avatar_url: pngDataUrl })
          .eq('id', currentUser.id);

        if (error) throw error;

        currentProfile.avatar_url = pngDataUrl;
        updateAvatarDisplay(pngDataUrl, currentProfile.full_name);
        toast('Profile photo updated successfully!', 'ok');

        if (statusEl) {
          statusEl.textContent = 'PNG photo updated successfully.';
          statusEl.style.color = '#74c686';
          setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 3000);
        }
      } catch (err) {
        console.error('Failed to save avatar:', err);
        toast('Could not save avatar: ' + (err.message || 'Unknown error'), 'err');
        if (statusEl) {
          statusEl.textContent = 'Upload failed.';
          statusEl.style.color = '#ef4444';
        }
      } finally {
        e.target.value = '';
      }
    };
    img.onerror = () => {
      toast('Failed to load the image. Please try another PNG file.', 'err');
      if (statusEl) statusEl.textContent = '';
      e.target.value = '';
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

async function handleRemoveAvatar() {
  if (!confirm('Remove your profile photo?')) return;
  const statusEl = document.getElementById('avatarUploadStatus');
  if (statusEl) statusEl.textContent = 'Removing…';

  try {
    const { error } = await supabaseClient
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', currentUser.id);

    if (error) throw error;

    currentProfile.avatar_url = null;
    updateAvatarDisplay(null, currentProfile.full_name);
    toast('Profile photo removed.', 'ok');
    if (statusEl) statusEl.textContent = '';
  } catch (err) {
    console.error('Failed to remove avatar:', err);
    toast('Failed to remove photo: ' + (err.message || 'Unknown error'), 'err');
    if (statusEl) statusEl.textContent = '';
  }
}

/* ============== TEACHER: Enter grades ============== */
async function loadEnterGradesForm(force = false) {
  const select = document.getElementById('egStudent');
  if (!select) return;
  if (select.dataset.loaded && !force) return;
  const currentVal = select.value;

  const { data, error } = await supabaseClient
    .from('students')
    .select('id, roll_no, class_name, profiles!inner(full_name)')
    .order('roll_no');

  select.innerHTML = '';
  if (error || !data || !data.length) {
    select.innerHTML = '<option value="">No students found</option>';
    return;
  }
  data.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.profiles.full_name} (${s.roll_no ? 'ID: ' + s.roll_no : 'no ID'})`;
    select.appendChild(opt);
  });
  if (currentVal && Array.from(select.options).some(o => o.value === currentVal)) {
    select.value = currentVal;
  }
  select.dataset.loaded = '1';
}

async function handleEnterGrade(e) {
  e.preventDefault();
  const studentId = document.getElementById('egStudent').value;
  const subject = document.getElementById('egSubject').value.trim();
  const term = document.getElementById('egTerm').value.trim();
  const grade = document.getElementById('egGrade').value.trim();

  if (!studentId) { toast('Select a student first.', 'err'); return; }

  const { error } = await supabaseClient.from('grades').insert({
    student_id: studentId,
    subject, term, grade,
    entered_by: currentUser.id
  });

  if (error) { toast('Could not save grade: ' + error.message, 'err'); return; }

  toast('Grade saved.', 'ok');
  document.getElementById('enterGradeForm').reset();
  document.getElementById('egStudent').dataset.loaded = '1';
}

/* ============== TEACHER: Update grade ============== */
async function loadUpdateGrades() {
  const { data, error } = await supabaseClient
    .from('grades')
    .select('id, subject, term, grade, students(profiles(full_name))')
    .order('updated_at', { ascending: false });

  const body = document.getElementById('updateGradesBody');
  const empty = document.getElementById('updateGradesEmpty');
  if (!body) return;

  // Preserve focus if user is actively typing in a grade input
  const activeInput = document.activeElement;
  if (activeInput && activeInput.closest('#updateGradesBody')) {
    activeInput.addEventListener('blur', () => loadUpdateGrades(), { once: true });
    return;
  }

  body.innerHTML = '';

  if (error) { toast('Could not load grades.', 'err'); return; }
  if (!data || !data.length) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.dataset.gradeRowId = row.id;
    const studentName = row.students?.profiles?.full_name || 'Unknown';
    tr.innerHTML = `
      <td>${escapeHtml(studentName)}</td>
      <td>${escapeHtml(row.subject)}</td>
      <td>${escapeHtml(row.term)}</td>
      <td><input value="${escapeHtml(row.grade)}" data-grade-id="${row.id}" style="width:70px; padding:6px 8px; border-radius:8px; border:1px solid var(--glass-specular-edge); background:rgba(18,22,34,0.75); color:var(--on-surface);"></td>
      <td><button class="btn btn-ghost" style="width:auto; padding:7px 14px;" data-save-id="${row.id}">Save</button></td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-save-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.saveId;
      const input = body.querySelector(`input[data-grade-id="${id}"]`);
      const { error } = await supabaseClient
        .from('grades')
        .update({ grade: input.value.trim(), updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) toast('Update failed: ' + error.message, 'err');
      else toast('Grade updated.', 'ok');
    });
  });
}

/* ============== ADMIN: Manage students ============== */
async function loadManageStudents(highlightRollNo = null) {
  const [{ data: students, error }, { count: teacherCount }, { count: gradeCount }] = await Promise.all([
    supabaseClient.from('students').select('id, roll_no, class_name, profiles!inner(full_name, email)'),
    supabaseClient.from('teachers').select('id', { count: 'exact', head: true }),
    supabaseClient.from('grades').select('id', { count: 'exact', head: true })
  ]);

  const sCount = document.getElementById('statStudents');
  const tCount = document.getElementById('statTeachers');
  const gCount = document.getElementById('statGrades');
  if (sCount) sCount.textContent = students ? students.length : 0;
  if (tCount) tCount.textContent = teacherCount ?? 0;
  if (gCount) gCount.textContent = gradeCount ?? 0;

  const body = document.getElementById('manageStudentsBody');
  const empty = document.getElementById('manageStudentsEmpty');
  if (!body) return;
  body.innerHTML = '';

  if (error) { toast('Could not load students.', 'err'); return; }
  if (!students || !students.length) { if (empty) empty.style.display = 'block'; return; }
  if (empty) empty.style.display = 'none';

  students.forEach(s => {
    const tr = document.createElement('tr');
    if (highlightRollNo && s.roll_no === highlightRollNo) {
      tr.className = 'row-highlight';
    }
    tr.innerHTML = `
      <td>${escapeHtml(s.profiles.full_name)}</td>
      <td>${escapeHtml(s.profiles.email)}</td>
      <td>${escapeHtml(s.roll_no || '—')}</td>`;
    body.appendChild(tr);
  });
}

/* ============== ADMIN: Approve teachers ============== */
async function loadApproveTeachers() {
  const { data, error } = await supabaseClient
    .from('teachers')
    .select('id, approved, profiles!inner(full_name, email, created_at)')
    .order('profiles(created_at)', { ascending: false });

  const body = document.getElementById('approveTeachersBody');
  const empty = document.getElementById('approveTeachersEmpty');
  body.innerHTML = '';

  if (error) { toast('Could not load teachers: ' + error.message, 'err'); return; }
  if (!data || !data.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  data.forEach(t => {
    const tr = document.createElement('tr');
    const isApproved = t.approved === true;
    tr.innerHTML = `
      <td>${escapeHtml(t.profiles.full_name)}</td>
      <td>${escapeHtml(t.profiles.email)}</td>
      <td>${formatDate(t.profiles.created_at)}</td>
      <td><span class="status-tag ${isApproved ? 'status-approved' : 'status-pending'}">${isApproved ? 'Approved' : 'Pending'}</span></td>
      <td>${isApproved
        ? ''
        : `<button class="btn btn-primary" style="width:auto; padding:7px 16px; height:auto; font-size:13px;" data-approve-id="${t.id}">Approve</button>`
      }</td>`;
    body.appendChild(tr);
  });

  body.querySelectorAll('[data-approve-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Approving…';
      const { error } = await supabaseClient
        .from('teachers')
        .update({ approved: true })
        .eq('id', btn.dataset.approveId);

      if (error) {
        toast('Failed to approve: ' + error.message, 'err');
        btn.disabled = false;
        btn.textContent = 'Approve';
      } else {
        toast('Teacher approved successfully!', 'ok');
        loadApproveTeachers(); // Refresh the list
      }
    });
  });
}

/* ============== ADMIN: Post announcement ============== */
async function handlePostAnnouncement(e) {
  e.preventDefault();
  const title = document.getElementById('annTitle').value.trim();
  const body = document.getElementById('annBody').value.trim();

  if (!title || !body) { toast('Please fill in both title and message.', 'err'); return; }

  const { error } = await supabaseClient.from('announcements').insert({
    title,
    body,
    posted_by: currentUser.id
  });

  if (error) { toast('Could not post announcement: ' + error.message, 'err'); return; }

  toast('Announcement posted!', 'ok');
  document.getElementById('announcementForm').reset();
  loadPostedAnnouncements();
}

async function loadPostedAnnouncements() {
  const { data, error } = await supabaseClient
    .from('announcements')
    .select('id, title, body, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  const list = document.getElementById('announcementsList');
  const empty = document.getElementById('announcementsEmpty');
  list.innerHTML = '';

  if (error) { toast('Could not load announcements.', 'err'); return; }
  if (!data || !data.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  data.forEach(ann => {
    const card = document.createElement('div');
    card.className = 'announcement-card';
    card.dataset.annId = ann.id;
    card.innerHTML = `
      <div class="announcement-header">
        <h4>${escapeHtml(ann.title)}</h4>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="announcement-date">${formatDate(ann.created_at)}</span>
          <button class="btn-icon-delete" data-delete-ann="${ann.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
      <p class="announcement-body">${escapeHtml(ann.body)}</p>`;
    list.appendChild(card);
  });

  list.querySelectorAll('[data-delete-ann]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this announcement?')) return;
      const { error } = await supabaseClient
        .from('announcements')
        .delete()
        .eq('id', btn.dataset.deleteAnn);
      if (error) toast('Delete failed: ' + error.message, 'err');
      else { toast('Announcement deleted.', 'ok'); loadPostedAnnouncements(); }
    });
  });
}

/* ============== ADMIN: Generate report ============== */
let lastReportRows = [];

async function loadReport() {
  const { data, error } = await supabaseClient
    .from('grades')
    .select('subject, term, grade, students(profiles(full_name)), entered_by_profile:profiles!grades_entered_by_fkey(full_name)')
    .order('updated_at', { ascending: false });

  const body = document.getElementById('reportBody');
  const empty = document.getElementById('reportEmpty');
  body.innerHTML = '';

  if (error) { toast('Could not load report: ' + error.message, 'err'); return; }
  if (!data.length) { empty.style.display = 'block'; lastReportRows = []; return; }
  empty.style.display = 'none';

  lastReportRows = data.map(r => ({
    student: r.students?.profiles?.full_name || 'Unknown',
    subject: r.subject,
    term: r.term,
    grade: r.grade,
    enteredBy: r.entered_by_profile?.full_name || '—'
  }));

  lastReportRows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(r.student)}</td>
      <td>${escapeHtml(r.subject)}</td>
      <td>${escapeHtml(r.term)}</td>
      <td>${gradeBadge(r.grade)}</td>
      <td>${escapeHtml(r.enteredBy)}</td>`;
    body.appendChild(tr);
  });
}

function exportCsv() {
  if (!lastReportRows.length) { toast('Nothing to export yet.', 'err'); return; }
  const header = 'Student,Subject,Term,Grade,Entered By\n';
  const rows = lastReportRows.map(r =>
    [r.student, r.subject, r.term, r.grade, r.enteredBy]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'grade-report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/* ============== helpers ============== */
function gradeBadge(grade) {
  const g = String(grade).toUpperCase();
  let cls = 'grade-mid';
  if (['A', 'A+', 'A-'].includes(g) || parseFloat(g) >= 90) cls = 'grade-A';
  else if (['D', 'F'].includes(g) || (parseFloat(g) < 60 && !isNaN(parseFloat(g)))) cls = 'grade-low';
  return `<span class="badge ${cls}">${escapeHtml(grade)}</span>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

let toastTimer;
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ============================================================
   REALTIME ENGINE & EVENT HANDLERS
   ============================================================ */

function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

const debouncedLoadStudentGrades = debounce((subject) => loadStudentGrades(subject), 300);
const debouncedLoadUpdateGrades = debounce(() => loadUpdateGrades(), 300);
const debouncedLoadManageStudents = debounce((rollNo) => loadManageStudents(rollNo), 300);
const debouncedLoadApproveTeachers = debounce(() => loadApproveTeachers(), 300);
const debouncedLoadReport = debounce(() => loadReport(), 300);
const debouncedLoadPostedAnnouncements = debounce(() => loadPostedAnnouncements(), 300);
const debouncedUpdateAdminStatsCounters = debounce(() => updateAdminStatsCounters(), 300);

async function updateAdminStatsCounters() {
  if (!currentProfile || currentProfile.role !== 'admin') return;
  try {
    const [{ count: studentCount }, { count: teacherCount }, { count: gradeCount }] = await Promise.all([
      supabaseClient.from('students').select('id', { count: 'exact', head: true }),
      supabaseClient.from('teachers').select('id', { count: 'exact', head: true }),
      supabaseClient.from('grades').select('id', { count: 'exact', head: true })
    ]);
    const sEl = document.getElementById('statStudents');
    const tEl = document.getElementById('statTeachers');
    const gEl = document.getElementById('statGrades');
    if (sEl && studentCount != null) sEl.textContent = studentCount;
    if (tEl && teacherCount != null) tEl.textContent = teacherCount;
    if (gEl && gradeCount != null) gEl.textContent = gradeCount;
  } catch (err) {
    console.warn('Failed to update stats counters:', err);
  }
}

function prependAnnouncementToModal(ann) {
  const body = document.getElementById('announcementsModalBody');
  const empty = document.getElementById('announcementsModalEmpty');
  if (!body) return;
  if (empty) empty.style.display = 'none';

  if (body.querySelector(`[data-ann-id="${ann.id}"]`)) return;

  const card = document.createElement('div');
  card.className = 'announcement-card new-announcement-highlight';
  card.dataset.annId = ann.id;
  card.innerHTML = `
    <div class="announcement-header">
      <h4>${escapeHtml(ann.title)} <span style="font-size:10px; background:var(--gold-soft); color:var(--gold-light); padding:2px 6px; border-radius:4px; margin-left:6px; font-weight:normal;">BAGO</span></h4>
      <span class="announcement-date">${formatDate(ann.created_at || new Date().toISOString())}</span>
    </div>
    <p class="announcement-body">${escapeHtml(ann.body)}</p>
    <p class="announcement-author">— Admin</p>`;

  body.prepend(card);
}

function removeAnnouncementFromModal(annId) {
  if (!annId) return;
  const card = document.querySelector(`#announcementsModalBody [data-ann-id="${annId}"]`);
  if (card) card.remove();
  const body = document.getElementById('announcementsModalBody');
  const empty = document.getElementById('announcementsModalEmpty');
  if (body && empty && body.querySelectorAll('.announcement-card').length === 0) {
    empty.style.display = 'block';
  }
}

function handleGradeRealtime(payload) {
  const role = currentProfile?.role;
  const event = payload.eventType;

  // Student view: reactive to own grades
  if (role === 'student') {
    const isMyGrade = (payload.new?.student_id === currentUser.id) || (payload.old?.student_id === currentUser.id);
    if (isMyGrade) {
      if (currentActiveView === 'view_grade') {
        debouncedLoadStudentGrades(payload.new?.subject);
      }
      if (event === 'INSERT') {
        toast(`Bagong grado: ${payload.new.subject} (${payload.new.grade})`, 'ok');
      } else if (event === 'UPDATE') {
        toast(`Na-update ang grado sa ${payload.new.subject}: ${payload.new.grade}`, 'ok');
      } else if (event === 'DELETE') {
        toast('May tinanggal na grado sa iyong talaan.', 'err');
      }
    }
  }

  // Teacher view: update grades table
  if (role === 'teacher') {
    if (currentActiveView === 'update_grade') {
      const activeInput = document.activeElement;
      if (activeInput && activeInput.closest('#updateGradesBody')) {
        activeInput.addEventListener('blur', () => debouncedLoadUpdateGrades(), { once: true });
      } else {
        debouncedLoadUpdateGrades();
      }
    }
  }

  // Admin view: stats and reports
  if (role === 'admin') {
    debouncedUpdateAdminStatsCounters();
    if (currentActiveView === 'generate_report') {
      debouncedLoadReport();
    }
    if (currentActiveView === 'manage_student') {
      debouncedLoadManageStudents();
    }
  }
}

function handleAnnouncementRealtime(payload) {
  const role = currentProfile?.role;
  const modal = document.getElementById('announcementsModal');
  const isModalOpen = modal && modal.style.display === 'flex';

  if (payload.eventType === 'INSERT') {
    if (role === 'student' || role === 'teacher') {
      updateNotifBadge();
      toast(`📢 Bagong anunsyo: ${payload.new.title || 'Anunsyo'}`, 'ok');
      if (isModalOpen) {
        prependAnnouncementToModal(payload.new);
      }
    }
    if (role === 'admin') {
      if (currentActiveView === 'post_announcement') {
        debouncedLoadPostedAnnouncements();
      }
    }
  } else if (payload.eventType === 'DELETE') {
    if (role === 'student' || role === 'teacher') {
      updateNotifBadge();
      if (isModalOpen) {
        removeAnnouncementFromModal(payload.old?.id);
      }
    }
    if (role === 'admin') {
      if (currentActiveView === 'post_announcement') {
        debouncedLoadPostedAnnouncements();
      }
    }
  }
}

function handleTeacherRealtime(payload) {
  const role = currentProfile?.role;

  if (role === 'admin') {
    debouncedUpdateAdminStatsCounters();
    if (currentActiveView === 'approve_teachers') {
      debouncedLoadApproveTeachers();
    }
    if (currentActiveView === 'manage_student') {
      debouncedLoadManageStudents();
    }
    if (payload.eventType === 'INSERT') {
      toast('May bagong guro na nag-register para sa approval.', 'ok');
    }
  }
}

function handleStudentRealtime(payload) {
  const role = currentProfile?.role;

  if (role === 'admin') {
    debouncedUpdateAdminStatsCounters();
    if (currentActiveView === 'manage_student') {
      debouncedLoadManageStudents(payload.new?.roll_no);
    }
    if (payload.eventType === 'INSERT') {
      toast('May bagong estudyanteng nag-register.', 'ok');
    }
  }

  if (role === 'teacher') {
    const select = document.getElementById('egStudent');
    if (select) {
      delete select.dataset.loaded;
      if (currentActiveView === 'enter_grades') {
        loadEnterGradesForm(true);
      }
    }
  }
}

function handleProfileRealtime(payload) {
  // If current logged-in user profile updated (e.g. from another tab/device)
  if (payload.new?.id === currentUser?.id) {
    currentProfile = { ...currentProfile, ...payload.new };
    const whoNameEl = document.getElementById('whoName');
    if (whoNameEl) whoNameEl.textContent = payload.new.full_name;
    updateAvatarDisplay(payload.new.avatar_url, payload.new.full_name);
    if (currentActiveView === 'view_profile') {
      loadProfileView();
    }
    return;
  }

  const role = currentProfile?.role;

  if (role === 'admin') {
    if (currentActiveView === 'manage_student') {
      debouncedLoadManageStudents();
    } else if (currentActiveView === 'approve_teachers') {
      debouncedLoadApproveTeachers();
    } else if (currentActiveView === 'generate_report') {
      debouncedLoadReport();
    }
  }

  if (role === 'teacher') {
    if (currentActiveView === 'enter_grades') {
      loadEnterGradesForm(true);
    } else if (currentActiveView === 'update_grade') {
      debouncedLoadUpdateGrades();
    }
  }
}

function setupPendingTeacherRealtime(teacherId) {
  if (!supabaseClient) return;
  const channel = supabaseClient
    .channel('pending-teacher-' + teacherId)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'teachers',
        filter: `id=eq.${teacherId}`
      },
      (payload) => {
        if (payload.new && payload.new.approved === true) {
          toast('Naaprubahan na ang iyong account! Naglo-load ang dashboard…', 'ok');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      }
    )
    .subscribe();
}

function setupRealtimeSubscriptions() {
  if (!supabaseClient || !currentUser) return;

  if (realtimeChannel) {
    try {
      supabaseClient.removeChannel(realtimeChannel);
    } catch (e) {
      console.warn(e);
    }
    realtimeChannel = null;
  }

  updateRealtimeStatusUI('CONNECTING');

  realtimeChannel = supabaseClient
    .channel('sims-live-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'grades' },
      handleGradeRealtime
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'announcements' },
      handleAnnouncementRealtime
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'teachers' },
      handleTeacherRealtime
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'students' },
      handleStudentRealtime
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      handleProfileRealtime
    )
    .subscribe((status, err) => {
      updateRealtimeStatusUI(status);
      if (err) console.warn('[Realtime error]:', err);
    });
}

function updateRealtimeStatusUI(status) {
  const pill = document.getElementById('realtimeStatusPill');
  const label = document.getElementById('realtimeStatusLabel');
  if (!pill || !label) return;

  pill.classList.remove('connecting', 'disconnected');

  if (status === 'SUBSCRIBED') {
    label.textContent = 'Live';
    pill.title = 'Realtime Connected — Lahat ng pagbabago ay awtomatikong lumalabas nang walang refresh.';
  } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CONNECTING') {
    pill.classList.add('connecting');
    label.textContent = 'Connecting…';
    pill.title = 'Nagsisikap kumonekta muli sa Supabase Realtime…';
  } else if (status === 'CLOSED') {
    pill.classList.add('disconnected');
    label.textContent = 'Offline';
    pill.title = 'Disconnected sa Supabase Realtime.';
  }
}

