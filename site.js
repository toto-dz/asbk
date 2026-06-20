// =============================================
// إعدادات API
// =============================================

const API_BASE = "https://script.google.com/macros/s/AKfycbwedYK4gwiFT2neYw1VM7GeG5JVVa7-frl6z8dttSp5-D9jWDskTxKM0dElIfamxqrCrw/exec";

// =============================================
// دوال جلب البيانات
// =============================================

async function fetchData(action, params = {}) {
    const url = new URL(API_BASE);
    url.searchParams.append('action', action);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    try {
        console.log(`🔗 [API REQUEST] action=${action}`, url.toString());
        const response = await fetch(url.toString());
        const data = await response.json();
        console.log(`📦 [API RESPONSE] action=${action} → success=${data.success}, rows=${Array.isArray(data.data) ? data.data.length : 'N/A'}`, data);
        if (!data.success) {
            console.warn(`⚠️ [API WARNING] action=${action} returned success=false`, data);
        }
        return data.success ? data.data : [];
    } catch (error) {
        console.error(`❌ [API ERROR] action=${action}:`, error);
        return [];
    }
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));
}

function getContactValue(contact, keys) {
    const key = keys.find(k => contact && contact[k] !== undefined && contact[k] !== null && String(contact[k]).trim() !== '');
    return key ? contact[key] : '';
}

function safeUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
    } catch {
        return '';
    }
}

// =============================================
// عرض بيانات التواصل (Contact) — contact.html & about.html
// =============================================

async function renderContact() {
    const container = document.getElementById('contactContainer') || document.getElementById('contactInfoContainer');
    if (!container) {
        console.warn('⚠️ renderContact: #contactContainer غير موجود');
        return;
    }

    container.innerHTML = `
        <div class="contact-grid">
            <div class="contact-item" style="opacity:0.4;">
                <i class="fas fa-spinner fa-spin"></i>
                <h4>جارٍ تحميل بيانات التواصل…</h4>
            </div>
        </div>`;

    const contacts = await fetchData('getContact');
    const c = contacts[0] || {};

    const address = getContactValue(c, ['Address', 'العنوان']);
    const phone = getContactValue(c, ['Phone Number', 'الهاتف', 'Phone']);
    const email = getContactValue(c, ['Email Address', 'البريد الإلكتروني', 'Email']);
    const social = getContactValue(c, ['Social Media Links', 'صفحات التواصل']);
    const mapsUrl = safeUrl(getContactValue(c, ['Google Maps Link', 'رابط الخريطة']));

    if (!address && !phone && !email && !social && !mapsUrl) {
        container.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--muted);">لا توجد بيانات تواصل. تأكد من وجود ورقة Contact وأن Apps Script يدعم action=getContact.</p>';
        return;
    }

    const items = [
        { icon: 'fa-map-marker-alt', label: 'العنوان', value: escapeHTML(address) },
        { icon: 'fa-phone', label: 'الهاتف', value: escapeHTML(phone) },
        { icon: 'fa-envelope', label: 'البريد الإلكتروني', value: escapeHTML(email) },
        { icon: 'fa-share-alt', label: 'صفحات التواصل', value: escapeHTML(social) }
    ].filter(item => item.value);

    if (mapsUrl) {
        items.push({
            icon: 'fa-map',
            label: 'الموقع على الخريطة',
            value: `<a href="${escapeHTML(mapsUrl)}" target="_blank" rel="noopener">فتح Google Maps</a>`
        });
    }

    container.innerHTML = `
        <div class="contact-grid">
            ${items.map(item => `
                <div class="contact-item">
                    <i class="fas ${item.icon}"></i>
                    <h4>${escapeHTML(item.label)}</h4>
                    <p>${item.value}</p>
                </div>
            `).join('')}
        </div>`;

    const mapContainer = document.getElementById('mapContainer');
    if (mapContainer) {
        mapContainer.innerHTML = mapsUrl
            ? `<div class="map-placeholder"><i class="fas fa-map" style="font-size:2rem; display:block; margin-bottom:8px;"></i><strong>الموقع على الخريطة</strong><br><a href="${escapeHTML(mapsUrl)}" target="_blank" rel="noopener">فتح Google Maps</a></div>`
            : '';
    }
}

// =============================================
// عرض المجموعات (Groups) — teams.html
// =============================================

async function renderGroups() {
    const container = document.getElementById('groupsContainer');
    if (!container) {
        console.warn('⚠️ renderGroups: #groupsContainer غير موجود');
        return;
    }
    console.log('🔄 renderGroups: جلب بيانات المجموعات والأعضاء…');

    const [groups, members] = await Promise.all([
        fetchData('getGroups'),
        fetchData('getMembers')
    ]);

    console.log('✅ renderGroups:', { groups, members });

    if (groups.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--muted);">لا توجد مجموعات مسجلة</p>';
        return;
    }

    container.innerHTML = groups.map(group => {
        const groupMembers = members.filter(m => m.GroupName === group.GroupName);
        const membersHTML = groupMembers.length > 0
            ? groupMembers.slice(0, 6).map(m =>
                `<li><strong>${m.MemberName || 'عضو'}</strong> <span>${m.Position || ''}</span></li>`
              ).join('')
            : '<li style="color:var(--muted);">لا يوجد أعضاء مسجلون</li>';

        return `
        <div class="card group-card">
            <i class="fas ${group.GroupIcon || 'fa-users'}"></i>
            <h3>${group.GroupName || 'غير معروف'}
                <span class="badge">${group.AgeRange || ''}</span>
            </h3>
            <div class="card-meta">
                <p><i class="fas fa-user-tie"></i> المدرب: <strong>${group.Coach || 'غير محدد'}</strong></p>
                <p><i class="fas fa-user-friends"></i> ${group.TotalMembers || 0} عضو${group.Sport ? ' | ' + group.Sport : ''}</p>
            </div>
            ${group.Description ? `<p class="group-desc">${group.Description}</p>` : ''}
            <ul class="members-list">${membersHTML}</ul>
        </div>`;
    }).join('');
}

// =============================================
// عرض جدول الأعضاء (Members) — teams.html & members.html
// =============================================

async function renderMembersTable() {
    const container = document.getElementById('membersTableContainer');
    if (!container) {
        console.warn('⚠️ renderMembersTable: #membersTableContainer غير موجود');
        return;
    }
    console.log('🔄 renderMembersTable: جلب بيانات الأعضاء للجدول…');

    const members = await fetchData('getMembers');
    console.log('✅ renderMembersTable: عدد الأعضاء =', members.length);

    if (members.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--muted);">لا يوجد أعضاء مسجلون</p>';
        return;
    }

    container.innerHTML = `
        <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; margin-top:16px; font-size:0.92rem;">
            <thead>
                <tr style="background:var(--primary, #1a3a5c); color:#fff;">
                    <th style="padding:10px 12px; text-align:right; border:1px solid #ddd;">المجموعة</th>
                    <th style="padding:10px 12px; text-align:right; border:1px solid #ddd;">الاسم</th>
                    <th style="padding:10px 12px; text-align:right; border:1px solid #ddd;">العمر</th>
                    <th style="padding:10px 12px; text-align:right; border:1px solid #ddd;">المنصب</th>
                    <th style="padding:10px 12px; text-align:right; border:1px solid #ddd;">الهاتف</th>
                    <th style="padding:10px 12px; text-align:right; border:1px solid #ddd;">تاريخ الانضمام</th>
                </tr>
            </thead>
            <tbody>
                ${members.map((m, i) => `
                <tr style="background:${i % 2 === 0 ? '#f9f9f9' : '#fff'};">
                    <td style="padding:8px 12px; border:1px solid #ddd;">${m.GroupName || '—'}</td>
                    <td style="padding:8px 12px; border:1px solid #ddd;">${m.MemberName || '—'}</td>
                    <td style="padding:8px 12px; border:1px solid #ddd;">${m.Age || '—'}</td>
                    <td style="padding:8px 12px; border:1px solid #ddd;">${m.Position || '—'}</td>
                    <td style="padding:8px 12px; border:1px solid #ddd;">${m.Phone || '—'}</td>
                    <td style="padding:8px 12px; border:1px solid #ddd;">${m.JoinDate || '—'}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        </div>`;
}

// =============================================
// عرض بطاقات الأعضاء — members.html
// =============================================

async function renderMembers() {
    const container = document.getElementById('membersContainer');
    if (!container) {
        console.warn('⚠️ renderMembers: #membersContainer غير موجود');
        return;
    }
    console.log('🔄 renderMembers: جلب بطاقات الأعضاء…');

    const members = await fetchData('getMembers');
    console.log('✅ renderMembers: عدد الأعضاء =', members.length);

    if (members.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--muted);">لا يوجد أعضاء مسجلون</p>';
        return;
    }

    container.innerHTML = members.map(m => `
        <div class="card member-card">
            <i class="fas fa-user-circle" style="font-size:2rem; color:var(--primary, #1a3a5c);"></i>
            <h3>${m.MemberName || '—'}</h3>
            <p><strong>المجموعة:</strong> ${m.GroupName || '—'}</p>
            <p><strong>المنصب:</strong> ${m.Position || '—'}</p>
            <p><strong>العمر:</strong> ${m.Age || '—'}</p>
            <p><strong>الهاتف:</strong> ${m.Phone || '—'}</p>
            <p><strong>تاريخ الانضمام:</strong> ${m.JoinDate || '—'}</p>
        </div>
    `).join('');
}

// =============================================
// عرض المعرض (Gallery) — gallery.html
// =============================================

async function renderGallery() {
    const container = document.getElementById('galleryContainer');
    if (!container) {
        console.warn('⚠️ renderGallery: #galleryContainer غير موجود');
        return;
    }
    console.log('🔄 renderGallery: جلب صور المعرض…');

    const images = await fetchData('getGallery');
    console.log('✅ renderGallery: عدد الصور =', images.length);

    if (images.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--muted);">لا توجد صور في المعرض</p>';
        return;
    }

    container.innerHTML = images.map(item => `
    <div class="gallery-item">
        <img src="${item.ImageUrl || ''}" alt="${item.Title || 'صورة'}"
             style="width:100%; height:180px; object-fit:cover; border-radius:8px; margin-bottom:12px;"
             onerror="this.style.display='none'">
        <h4>${item.Title || ''}</h4>
        <small style="color:var(--muted);">${item.Category || ''}</small>
        <small style="color:var(--muted); display:block;">${item.Date || ''}</small>
    </div>`).join('');
}

// =============================================
// عرض الدورات (Courses) — courses.html & home
// =============================================

async function renderCourses() {
    console.log('🔄 renderCourses: جلب بيانات الدورات…');
    const courses = await fetchData('getCourses');
    console.log('✅ renderCourses: عدد الدورات =', courses.length);

    if (courses.length === 0) return;

    // تحديث بيانات البطولة (data-key) في أي صفحة
    const course = courses[0];
    document.querySelectorAll('[data-key="start_date"]').forEach(el => {
        el.textContent = course.StartDate || el.textContent;
    });
    document.querySelectorAll('[data-key="location"]').forEach(el => {
        el.textContent = course.Location || el.textContent;
    });
    document.querySelectorAll('[data-key="age_groups"]').forEach(el => {
        el.textContent = course.AgeRange || el.textContent;
    });

    // عرض جميع الدورات في coursesContainer
    const coursesContainer = document.getElementById('coursesContainer');
    if (coursesContainer) {
        console.log('✅ renderCourses: عرض الدورات في #coursesContainer');
        coursesContainer.innerHTML = courses.map(c => `
            <div class="card course-card">
                <i class="fas fa-futbol"></i>
                <h3>${c.Sport || ''}</h3>
                ${c.Description ? `<p class="course-desc">${c.Description}</p>` : ''}
                <div class="course-meta">
                    <p><strong>الفئة العمرية:</strong> <span>${c.AgeRange || '—'}</span></p>
                    <p><strong>عدد المجموعات:</strong> <span>${c.TotalGroups || '—'}</span></p>
                    <p><strong>تاريخ البداية:</strong> <span>${c.StartDate || '—'}</span></p>
                    <p><strong>تاريخ النهاية:</strong> <span>${c.EndDate || '—'}</span></p>
                    <p><strong>الموقع:</strong> <span>${c.Location || '—'}</span></p>
                </div>
            </div>
        `).join('');
    }
}

// =============================================
// عرض الإعلانات (Announcements) — news.html
// =============================================

async function renderAnnouncements() {
    const container = document.getElementById('announcementsContainer');
    if (!container) {
        console.warn('⚠️ renderAnnouncements: #announcementsContainer غير موجود');
        return;
    }
    console.log('🔄 renderAnnouncements: جلب الإعلانات…');

    const announcements = await fetchData('getAnnouncements');
    console.log('✅ renderAnnouncements: عدد الإعلانات =', announcements.length);

    if (announcements.length === 0) {
        container.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--muted);">لا توجد إعلانات حالياً</p>';
        return;
    }

    const priorityIcon = (p) => {
        if (p === 'مرتفعة') return '🔴';
        if (p === 'متوسطة') return '🟡';
        return '🟢';
    };

    container.innerHTML = announcements.map(a => `
        <div class="card announcement-card">
            <i class="fas fa-bullhorn"></i>
            <h3>${priorityIcon(a.Priority)} ${a.Title || 'إعلان'}</h3>
            <p>${a.Content || ''}</p>
            <small style="color:var(--muted);"><i class="fas fa-calendar-day"></i> ${a.Date || ''}</small>
        </div>
    `).join('');
}

// =============================================
// عرض المباريات (Matches) — courses.html
// =============================================

async function renderMatches() {
    const container = document.getElementById('matchesContainer');
    if (!container) {
        console.warn('⚠️ renderMatches: #matchesContainer غير موجود');
        return;
    }
    console.log('🔄 renderMatches: جلب بيانات المباريات…');

    const matches = await fetchData('getMatches', { sheet: 'match' });
    console.log('✅ renderMatches: عدد المباريات =', matches.length);

    if (matches.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--muted);">لا توجد مباريات مسجلة اليوم</p>';
        return;
    }

    container.innerHTML = matches.map(m => {
        const team1 = m.groupe_A || 'فريق 1';
        const team2 = m.groupe_B || 'فريق 2';
        const logo1 = safeUrl(m.logo_icip_A || '');
        const logo2 = safeUrl(m.logo_icip_B || '');
        const time = m.time_matche || '';
        const local = m.local || '';

        return `
        <div class="match-card">
            <div class="flex items-center justify-center gap-2 text-xs md:text-sm" style="color: #fbbf24; font-weight: 700; margin-bottom: 12px;">
                <i class="fas fa-trophy"></i>
                <span>مباراة اليوم</span>
            </div>
            <div class="match-row">
                <div class="flex flex-col items-center gap-1 md:gap-2">
                    <div class="team-circle red">
                        ${logo1 ? `<img src="${escapeHTML(logo1)}" alt="${escapeHTML(team1)}" style="width:65%; height:65%; object-fit:contain;" onerror="this.style.display='none'">` : '<i class="fas fa-shield-alt"></i>'}
                    </div>
                    <span class="team-name">${escapeHTML(team1)}</span>
                </div>
                <div class="vs-badge">VS</div>
                <div class="flex flex-col items-center gap-1 md:gap-2">
                    <div class="team-circle blue">
                        ${logo2 ? `<img src="${escapeHTML(logo2)}" alt="${escapeHTML(team2)}" style="width:65%; height:65%; object-fit:contain;" onerror="this.style.display='none'">` : '<i class="fas fa-shield-alt"></i>'}
                    </div>
                    <span class="team-name">${escapeHTML(team2)}</span>
                </div>
            </div>
            <div class="match-info mt-3 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
                ${time ? `<span class="flex items-center gap-1.5"><i class="fas fa-clock"></i> ${escapeHTML(time)}</span>` : ''}
                ${time && local ? '<span class="hidden xs:inline opacity-30">|</span>' : ''}
                ${local ? `<span class="flex items-center gap-1.5"><i class="fas fa-map-marker-alt"></i> ${escapeHTML(local)}</span>` : ''}
            </div>
        </div>`;
    }).join('');
}

// =============================================
// تهيئة الصفحات حسب نوعها (DOMContentLoaded)
// =============================================

document.addEventListener('DOMContentLoaded', function () {
    const page = document.body.dataset.page || 'home';
    console.log(`📄 [PAGE INIT] الصفحة الحالية: "${page}"`);

    switch (page) {
        case 'home':
            console.log('🏠 home: تحديث معلومات الدورة');
            renderCourses();
            break;

        case 'courses':
            console.log('📚 courses: عرض جدول الدورات + المباريات');
            renderCourses();
            renderMatches();
            break;

        case 'teams':
            console.log('👥 teams: عرض المجموعات + جدول الأعضاء');
            renderGroups();
            renderMembersTable();
            break;

        case 'members':
            console.log('👤 members: عرض بطاقات الأعضاء + الجدول');
            renderMembers();
            renderMembersTable();
            break;

        case 'gallery':
            console.log('🖼️ gallery: عرض معرض الصور');
            renderGallery();
            break;

        case 'news':
            console.log('📰 news: عرض الإعلانات');
            renderAnnouncements();
            break;

        case 'about':
            console.log('ℹ️ about: عرض معلومات التواصل');
            renderContact();
            break;

        case 'contact':
            console.log('📞 contact: عرض بيانات التواصل من Google Sheets');
            renderContact();
            break;

        default:
            console.log(`ℹ️ الصفحة "${page}" لا تحتاج تحميل بيانات خاصة`);
    }

    // =============================================
    // تهيئة التوقيت الحالي للـ Navbar
    // =============================================
    function updateClock() {
        const now = new Date();
        const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        const timeString = now.toLocaleTimeString('ar-DZ', opts);
        document.querySelectorAll('.current-datetime').forEach(el => {
            el.textContent = timeString;
        });
    }
    updateClock();
    setInterval(updateClock, 1000);
});