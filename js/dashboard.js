let currentUser = null;
let currentProfile = null;

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
    { id: 'post_announcement', label: 'Post announcement' }
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

  // Block unapproved teachers from dashboard
  if (profile.role === 'teacher') {
    const { data: teacher } = await supabaseClient
      .from('teachers')
      .select('approved')
      .eq('id', currentUser.id)
      .single();

    if (!teacher || teacher.approved !== true) {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.innerHTML = '<div style="text-align:center;max-width:400px;"><h2 style="font-family:var(--serif);margin-bottom:12px;">Pending Approval</h2><p style="color:var(--text-muted);margin-bottom:20px;">Your teacher account is waiting for admin approval. Please check back later.</p><button class="btn btn-ghost" onclick="supabaseClient.auth.signOut().then(()=>window.location.href=\'index.html\')" style="width:auto;padding:10px 20px;">Back to Login</button></div>';
      }
      return;
    }
  }

  document.getElementById('whoName').textContent = profile.full_name;
  document.getElementById('whoRole').textContent = profile.role;

  buildNav(profile.role);

  // Show notification bell for students and teachers
  if (profile.role === 'student' || profile.role === 'teacher') {
    setupNotificationBell();
  }

  document.getElementById('loader').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('enterGradeForm')?.addEventListener('submit', handleEnterGrade);
  document.getElementById('exportCsvBtn')?.addEventListener('click', exportCsv);
  document.getElementById('announcementForm')?.addEventListener('submit', handlePostAnnouncement);
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
async function loadStudentGrades() {
  const { data, error } = await supabaseClient
    .from('grades')
    .select('subject, term, grade, updated_at')
    .eq('student_id', currentUser.id)
    .order('updated_at', { ascending: false });

  const body = document.getElementById('studentGradesBody');
  const empty = document.getElementById('studentGradesEmpty');
  body.innerHTML = '';

  if (error) { toast('Could not load grades.', 'err'); return; }
  if (!data.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(row.subject)}</td>
      <td>${escapeHtml(row.term)}</td>
      <td>${gradeBadge(row.grade)}</td>
      <td>${formatDate(row.updated_at)}</td>`;
    body.appendChild(tr);
  });
}

/* ============== View profile (student + teacher) ============== */
async function loadProfileView() {
  document.getElementById('profFullName').value = currentProfile.full_name;
  document.getElementById('profEmail').value = currentProfile.email;

  const wrap1 = document.getElementById('profExtraWrap1');
  const wrap2 = document.getElementById('profExtraWrap2');

  if (currentProfile.role === 'student') {
    const { data } = await supabaseClient
      .from('students')
      .select('roll_no, class_name')
      .eq('id', currentUser.id)
      .single();
    wrap1.style.display = 'block';
    document.getElementById('profExtraLabel1').textContent = 'Student ID';
    document.getElementById('profExtra1').value = data?.roll_no || '—';
    wrap2.style.display = 'none';
  } else if (currentProfile.role === 'teacher') {
    const { data } = await supabaseClient
      .from('teachers')
      .select('subject_specialty')
      .eq('id', currentUser.id)
      .single();
    wrap1.style.display = 'block';
    document.getElementById('profExtraLabel1').textContent = 'Subject specialty';
    document.getElementById('profExtra1').value = data?.subject_specialty || '—';
    wrap2.style.display = 'none';
  } else {
    wrap1.style.display = 'none';
    wrap2.style.display = 'none';
  }
}

/* ============== TEACHER: Enter grades ============== */
async function loadEnterGradesForm() {
  const select = document.getElementById('egStudent');
  if (select.dataset.loaded) return;

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
  body.innerHTML = '';

  if (error) { toast('Could not load grades.', 'err'); return; }
  if (!data.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  data.forEach(row => {
    const tr = document.createElement('tr');
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
async function loadManageStudents() {
  const [{ data: students, error }, { count: teacherCount }, { count: gradeCount }] = await Promise.all([
    supabaseClient.from('students').select('id, roll_no, class_name, profiles!inner(full_name, email)'),
    supabaseClient.from('teachers').select('id', { count: 'exact', head: true }),
    supabaseClient.from('grades').select('id', { count: 'exact', head: true })
  ]);

  document.getElementById('statStudents').textContent = students ? students.length : 0;
  document.getElementById('statTeachers').textContent = teacherCount ?? 0;
  document.getElementById('statGrades').textContent = gradeCount ?? 0;

  const body = document.getElementById('manageStudentsBody');
  const empty = document.getElementById('manageStudentsEmpty');
  body.innerHTML = '';

  if (error) { toast('Could not load students.', 'err'); return; }
  if (!students.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  students.forEach(s => {
    const tr = document.createElement('tr');
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
  el.textContent = msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
