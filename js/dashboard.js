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
    { id: 'generate_report', label: 'Generate report' }
  ]
};

const PAGE_META = {
  view_grade: ['My grades', 'A record of everything your teachers have entered.'],
  view_profile: ['My profile', 'Your account details on record.'],
  enter_grades: ['Enter grades', 'Add a grade for one of your students.'],
  update_grade: ['Update grade', 'Edit grades already on file.'],
  manage_student: ['Manage students', 'Everyone currently enrolled.'],
  generate_report: ['Generate report', 'A full export of grades across the system.']
};

init();

async function init() {
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

  document.getElementById('whoName').textContent = profile.full_name;
  document.getElementById('whoRole').textContent = profile.role;

  buildNav(profile.role);

  document.getElementById('loader').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';

  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('enterGradeForm').addEventListener('submit', handleEnterGrade);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
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
    generate_report: loadReport
  };
  if (loaders[viewId]) loaders[viewId]();
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
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
    document.getElementById('profExtraLabel1').textContent = 'Roll number';
    document.getElementById('profExtra1').value = data?.roll_no || '—';
    wrap2.style.display = 'block';
    document.getElementById('profExtraLabel2').textContent = 'Class';
    document.getElementById('profExtra2').value = data?.class_name || '—';
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
    opt.textContent = `${s.profiles.full_name} (${s.roll_no || 'no roll no'})`;
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
  document.getElementById('egStudent').dataset.loaded = '1'; // keep list, just reset visible value
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
      <td><input value="${escapeHtml(row.grade)}" data-grade-id="${row.id}" style="width:70px; padding:6px 8px; border-radius:8px; border:1px solid var(--glass-border); background:rgba(255,255,255,0.04); color:var(--text);"></td>
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
      <td>${escapeHtml(s.roll_no || '—')} / ${escapeHtml(s.class_name || '—')}</td>`;
    body.appendChild(tr);
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
