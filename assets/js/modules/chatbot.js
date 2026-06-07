import state from './state.js';
import { isDonorEligible, normalizeBloodGroup } from './utils.js';

function getPageHref(page) {
    const path = window.location.pathname || '';
    return path.includes('/pages/') ? page : `pages/${page}`;
}

function getContactHref() {
    return window.location.pathname.includes('/pages/') ? '../index.html#contact' : '#contact';
}

function getSearchHref() {
    return getPageHref('search.html');
}

function isBangla(text) {
    const banglaChars = (text.match(/[\u0980-\u09FF]/g) || []).length;
    return banglaChars > text.length * 0.15;
}

function isBanglish(text) {
    const banglishWords = ['ami', 'amr', 'amar', 'tumi', 'tomar', 'apni', 'apnar', 'kemon', 'kothay', 'keno', 'ki', 'holo', 'hobe', 'hoy', 'kore', 'korbo', 'korte', 'korlam', 'korsi', 'chai', 'ache', 'achen', 'thik', 'bhai', 'vai', 'bol', 'bolo', 'bolun', 'rokte', 'rokto', 'rokter', 'blood', 'daan', 'dan', 'parbo', 'parbe', 'parben', 'jodi', 'tahole', 'amader', 'oder', 'tader', 'shob', 'sob', 'keu', 'karo', 'jano', 'janen', 'bujhi', 'bujhen', 'dite', 'nite', 'lagbe', 'dorkar', 'sahajjo', 'help', 'poribar', 'poribarer', 'shastho', 'shasthyo', 'rog', 'rogi', 'hospital', 'daktar', 'doctor', 'oshudh', 'kivabe', 'kemne', 'onek', 'ektu', 'aktu', 'please', 'plz', 'doya', 'janaben', 'janao', 'group', 'grp', 'donate', 'dibo', 'dibi', 'debe', 'nibo', 'nebo', 'hae', 'haa', 'na', 'nah', 'aro', 'ar', 'ba', 'ebong', 'kintu', 'tobe', 'je', 'jar', 'eta', 'ota', 'sheta', 'kota', 'kothai', 'weak', 'durbol', 'problem', 'somossa', 'shomossa', 'jabe', 'dewa', 'deya', 'deowa', 'rakte', 'din', 'dilen', 'dilam', 'pari', 'paro', 'paren', 'possible', 'age', 'boyosh', 'ojon', 'weight', 'kg', 'hemoglobin', 'iron', 'tablet', 'medicine', 'oshudh', 'khete', 'khabo', 'khaben', 'khawar', 'pore', 'agey', 'age', 'shomoy', 'somoy', 'time', 'koto', 'kokhon', 'kobe', 'theke', 'jonno', 'jonne', 'dhoroner', 'type', 'negative', 'positive', 'thalassemia', 'cancer', 'diabetes', 'sugar', 'pressure', 'bp', 'anemia', 'infection', 'fever', 'jor', 'gaye', 'matha', 'ghora', 'byatha', 'betha', 'lage', 'lagche', 'shurjo', 'safe', 'nirapod', 'khatarnak', 'risk', 'bhoy', 'bhoi', 'test', 'poriksha', 'report', 'normal', 'abnormal', 'donor', 'donner', 'donar', 'khuje', 'khujte', 'khuji', 'paoa', 'pawa', 'contact', 'number', 'phone', 'call', 'akjon', 'ekjon', 'jon', 'er', 'dao', 'daw', 'den', 'name', 'koi', 'koy', 'kobe', 'kotha'];
    const words = text.toLowerCase().split(/\s+/);
    const matched = words.filter(w => banglishWords.includes(w)).length;
    return matched >= 2 || (matched >= 1 && words.length <= 5);
}

function detectLang(text) {
    if (isBangla(text)) return 'bangla';
    if (isBanglish(text)) return 'banglish';
    return 'english';
}

function normalizeQuestionForKB(text) {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s+-]/gu, ' ')
        .replace(/\btrips\b/g, 'tips')
        .replace(/\bdonat\b/g, 'donation')
        .replace(/\bdonateing\b/g, 'donating')
        .replace(/\bblud\b/g, 'blood')
        .replace(/\brokter\b/g, 'rokto')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractBloodGroup(text) {
    const t = text.toLowerCase().replace(/\s+/g, ' ').trim();

    
    const directMap = {
        'a+': 'A+', 'a plus': 'A+', 'a positive': 'A+', 'a pos': 'A+',
        'a-': 'A-', 'a minus': 'A-', 'a negative': 'A-', 'a neg': 'A-',
        'b+': 'B+', 'b plus': 'B+', 'b positive': 'B+', 'b pos': 'B+',
        'b-': 'B-', 'b minus': 'B-', 'b negative': 'B-', 'b neg': 'B-',
        'ab+': 'AB+', 'ab plus': 'AB+', 'ab positive': 'AB+', 'ab pos': 'AB+',
        'ab-': 'AB-', 'ab minus': 'AB-', 'ab negative': 'AB-', 'ab neg': 'AB-',
        'o+': 'O+', 'o plus': 'O+', 'o positive': 'O+', 'o pos': 'O+',
        'o-': 'O-', 'o minus': 'O-', 'o negative': 'O-', 'o neg': 'O-',
    };
    for (const [pattern, group] of Object.entries(directMap)) {
        if (t.includes(pattern)) return group;
    }

    
    const rgx = /\b(ab|a|b|o)\s*(\+|-|pos(?:itive)?|neg(?:ative)?|plus|minus)\b/i;
    const m = t.match(rgx);
    if (m) {
        const letter = m[1].toUpperCase();
        const sign = /pos|plus|\+/.test(m[2].toLowerCase()) ? '+' : '-';
        return letter + sign;
    }

    
    const banglaMap = [
        { patterns: ['এবি পজিটিভ', 'এবি পজেটিভ', 'এবি প্লাস'], group: 'AB+' },
        { patterns: ['এবি নেগেটিভ', 'এবি নেগেটিভ', 'এবি মাইনাস'], group: 'AB-' },
        { patterns: ['এ পজিটিভ', 'এ পজেটিভ', 'এ প্লাস'], group: 'A+' },
        { patterns: ['এ নেগেটিভ', 'এ নেগেটিভ', 'এ মাইনাস'], group: 'A-' },
        { patterns: ['বি পজিটিভ', 'বি পজেটিভ', 'বি প্লাস'], group: 'B+' },
        { patterns: ['বি নেগেটিভ', 'বি নেগেটিভ', 'বি মাইনাস'], group: 'B-' },
        { patterns: ['ও পজিটিভ', 'ও পজেটিভ', 'ও প্লাস'], group: 'O+' },
        { patterns: ['ও নেগেটিভ', 'ও নেগেটিভ', 'ও মাইনাস'], group: 'O-' },
    ];
    for (const { patterns, group } of banglaMap) {
        for (const p of patterns) {
            if (text.includes(p)) return group;
        }
    }

    
    const banglishMap = {
        'bi positive': 'B+', 'bi pos': 'B+', 'bi plus': 'B+', 'bi +': 'B+',
        'bi negative': 'B-', 'bi neg': 'B-', 'bi minus': 'B-', 'bi -': 'B-',
        'ey positive': 'A+', 'ey pos': 'A+', 'ey plus': 'A+',
        'ey negative': 'A-', 'ey neg': 'A-', 'ey minus': 'A-',
    };
    for (const [pattern, group] of Object.entries(banglishMap)) {
        if (t.includes(pattern)) return group;
    }

    return null;
}

function isDonorIntent(text) {
    const t = text.toLowerCase();
    const intentPhrases = [
        
        'need blood', 'need donor', 'find donor', 'search donor', 'looking for donor',
        'looking for blood', 'blood needed', 'donor needed', 'urgent blood',
        'emergency blood', 'want blood', 'require blood', 'get blood',
        'any donor', 'available donor', 'donor available', 'donor list',
        'show donor', 'donor contact', 'donor number', 'donor phone',
        'who can give', 'give blood', 'donor khuje', 'donor khuji',
        
        'rokto dorkar', 'rokto lagbe', 'blood dorkar', 'blood lagbe',
        'donor lagbe', 'donor dorkar', 'donor khujte', 'donor chai',
        'rokto chai', 'blood chai', 'rokto paoa', 'rokto pawa',
        'rokto dite parbe', 'ke dite parbe', 'donor khoj',
        'donor dekhao', 'donor dao', 'rokto dao', 'rokte dorkar',
        'rokter dorkar', 'donor paben', 'donor paoa jabe',
        'emergency rokto', 'jruri rokto', 'urgent rokto',
        
        'রক্ত দরকার', 'রক্ত লাগবে', 'রক্ত চাই', 'ডোনার দরকার',
        'ডোনার লাগবে', 'ডোনার চাই', 'ডোনার খুঁজ', 'রক্তদাতা খুঁজ',
        'রক্তদাতা দরকার', 'রক্তদাতা চাই', 'রক্তদাতা লাগবে',
        'রক্ত প্রয়োজন', 'জরুরি রক্ত', 'রক্ত পাওয়া', 'কে দিতে পারবে',
    ];
    return intentPhrases.some(phrase => t.includes(phrase));
}

function wantsNameOnly(text) {
    const t = text.toLowerCase();
    const hasName = ['name', 'naam', 'nam', 'নাম'].some(w => t.includes(w));
    const hasDonor = ['donor', 'rokto', 'blood', 'রক্ত', 'দাতা', 'ডোনার'].some(w => t.includes(w));
    return hasName && hasDonor;
}

function findEligibleDonors(bloodGroup) {
    if (!state.donorsList || state.donorsList.length === 0) return [];
    const normalized = normalizeBloodGroup(bloodGroup);
    return state.donorsList.filter(d => {
        const dGroup = normalizeBloodGroup(d.bloodGroup || d.blood || d.blood_group);
        return dGroup === normalized && isDonorEligible(d.lastDonateDate);
    });
}

function findDonorsByGroup(bloodGroup) {
    if (!state.donorsList || state.donorsList.length === 0) return [];
    const normalized = normalizeBloodGroup(bloodGroup);
    return state.donorsList.filter(d => {
        const dGroup = normalizeBloodGroup(d.bloodGroup || d.blood || d.blood_group);
        return dGroup === normalized;
    });
}

function formatDonorResults(donors, bloodGroup, lang) {
    const searchHref = getSearchHref();
    if (!donors || donors.length === 0) {
        if (lang === 'bangla') return `দুঃখিত, এই মুহূর্তে <strong>${bloodGroup}</strong> রক্তের গ্রুপে কোনো যোগ্য দাতা পাওয়া যায়নি। 😔<br><br>📋 আমাদের <a href="${searchHref}" style="color:#dc2626;font-weight:600">ডোনার সার্চ পেজে</a> চেক করুন অথবা পরে আবার চেষ্টা করুন।`;
        if (lang === 'banglish') return `Sorry, ekhon <strong>${bloodGroup}</strong> blood group er kono eligible donor paoa jaynai. 😔<br><br>📋 Amader <a href="${searchHref}" style="color:#dc2626;font-weight:600">Donor Search page</a> e check korun ba pore abar try korun.`;
        return `Sorry, no eligible <strong>${bloodGroup}</strong> donors are available right now. 😔<br><br>📋 Check our <a href="${searchHref}" style="color:#dc2626;font-weight:600">Donor Search page</a> or try again later.`;
    }

    const count = donors.length;
    let header;
    if (lang === 'bangla') {
        header = `🩸 <strong>${bloodGroup}</strong> রক্তের গ্রুপে <strong>${count}</strong> জন যোগ্য দাতা পাওয়া গেছে:`;
    } else if (lang === 'banglish') {
        header = `🩸 <strong>${bloodGroup}</strong> blood group e <strong>${count}</strong> jon eligible donor paoa gese:`;
    } else {
        header = `🩸 Found <strong>${count}</strong> eligible <strong>${bloodGroup}</strong> donor${count > 1 ? 's' : ''}:`;
    }

    const maxShow = 120;
    const list = donors.slice(0, maxShow).map((d, i) => {
        const name = d.fullName || d.name || 'Unknown';
        const phone = d.phone || d.contact || 'N/A';
        const loc = d.location || d.area || '';
        const lastDate = d.lastDonateDate ? new Date(d.lastDonateDate).toLocaleDateString('en-GB') : '';
        let row = `<div style="background:#f9fafb;border-radius:0.5rem;padding:0.5rem 0.65rem;margin-top:0.35rem;border-left:3px solid #dc2626">`;
        row += `<div style="font-weight:600;color:#111827">${i + 1}. ${name}</div>`;
        row += `<div style="font-size:0.75rem;color:#6b7280;margin-top:2px">📞 ${phone}`;
        if (loc) row += ` &nbsp;•&nbsp; 📍 ${loc}`;
        if (lastDate) row += ` &nbsp;•&nbsp; 🗓️ Last: ${lastDate}`;
        row += `</div></div>`;
        return row;
    }).join('');

    let footer = '';
    if (count > maxShow) {
        const remaining = count - maxShow;
        if (lang === 'bangla') footer = `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">...এবং আরও ${remaining} জন দাতা আছেন। সম্পূর্ণ তালিকার জন্য <a href="${searchHref}" style="color:#dc2626;font-weight:600">সার্চ পেজ</a> দেখুন।</div>`;
        else if (lang === 'banglish') footer = `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">...ar o ${remaining} jon donor achen. Full list er jonno <a href="${searchHref}" style="color:#dc2626;font-weight:600">Search page</a> dekhun.</div>`;
        else footer = `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">...and ${remaining} more. See the full list on our <a href="${searchHref}" style="color:#dc2626;font-weight:600">Search page</a>.</div>`;
    }

    let tip;
    if (lang === 'bangla') tip = `<div style="margin-top:0.5rem;font-size:0.75rem;color:#059669">✅ সকল দাতা যোগ্য (শেষ রক্তদানের পর ১২০+ দিন পার হয়েছে)</div>`;
    else if (lang === 'banglish') tip = `<div style="margin-top:0.5rem;font-size:0.75rem;color:#059669">✅ Sob donor eligible (last donation theke 120+ din hoyeche)</div>`;
    else tip = `<div style="margin-top:0.5rem;font-size:0.75rem;color:#059669">✅ All donors are eligible (120+ days since last donation)</div>`;

    return header + list + footer + tip;
}

function formatFallbackDonorResults(donors, bloodGroup, lang) {
    const searchHref = getSearchHref();
    const count = donors.length;
    const header = lang === 'bangla'
        ? `⚠️ এই মুহূর্তে <strong>${bloodGroup}</strong> গ্রুপে যোগ্য দাতা পাওয়া যায়নি। তবে ${count} জন দাতা পাওয়া গেছে (সম্ভবত অপেক্ষার সময় চলছে):`
        : lang === 'banglish'
            ? `⚠️ Ekhon <strong>${bloodGroup}</strong> group e eligible donor nai. Kintu ${count} jon donor paoa gese (waiting period thakte pare):`
            : `⚠️ No eligible <strong>${bloodGroup}</strong> donors right now, but ${count} donors were found (they may be in the waiting period):`;

    const maxShow = 120;
    const list = donors.slice(0, maxShow).map((d, i) => {
        const name = d.fullName || d.name || 'Unknown';
        const phone = d.phone || d.contact || 'N/A';
        const loc = d.location || d.area || '';
        let row = `<div style="background:#fff1f2;border-radius:0.5rem;padding:0.5rem 0.65rem;margin-top:0.35rem;border-left:3px solid #f97316">`;
        row += `<div style="font-weight:600;color:#111827">${i + 1}. ${name}</div>`;
        row += `<div style="font-size:0.75rem;color:#6b7280;margin-top:2px">📞 ${phone}`;
        if (loc) row += ` &nbsp;•&nbsp; 📍 ${loc}`;
        row += `</div></div>`;
        return row;
    }).join('');

    const footer = lang === 'bangla'
        ? `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">সম্পূর্ণ তালিকার জন্য <a href="${searchHref}" style="color:#dc2626;font-weight:600">সার্চ পেজ</a> দেখুন বা অ্যাডমিনের সাথে যোগাযোগ করুন।</div>`
        : lang === 'banglish'
            ? `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">Full list er jonno <a href="${searchHref}" style="color:#dc2626;font-weight:600">Search page</a> e jan ba admin er sathe jogajog korun.</div>`
            : `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">See the full list on the <a href="${searchHref}" style="color:#dc2626;font-weight:600">Search page</a> or contact admin.</div>`;

    return header + list + footer;
}

function formatDonorNameResults(donors, bloodGroup, lang) {
    const maxShow = 120;
    const count = donors.length;
    let header;
    if (lang === 'bangla') {
        header = `🩸 <strong>${bloodGroup}</strong> গ্রুপে <strong>${count}</strong> জন দাতার নাম:`;
    } else if (lang === 'banglish') {
        header = `🩸 <strong>${bloodGroup}</strong> group e <strong>${count}</strong> jon donor er naam:`;
    } else {
        header = `🩸 <strong>${count}</strong> <strong>${bloodGroup}</strong> donor name(s):`;
    }

    const list = donors.slice(0, maxShow).map((d, i) => {
        const name = d.fullName || d.name || 'Unknown';
        return `<div style="background:#f9fafb;border-radius:0.5rem;padding:0.5rem 0.65rem;margin-top:0.35rem;border-left:3px solid #dc2626">${i + 1}. ${name}</div>`;
    }).join('');

    let footer = '';
    if (count > maxShow) {
        const remaining = count - maxShow;
        if (lang === 'bangla') footer = `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">...এবং আরও ${remaining} জন দাতা আছেন।</div>`;
        else if (lang === 'banglish') footer = `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">...ar o ${remaining} jon donor achen.</div>`;
        else footer = `<div style="margin-top:0.5rem;font-size:0.78rem;color:#6b7280">...and ${remaining} more.</div>`;
    }
    return header + list + footer;
}

function buildDonorContext(question) {
    const lang = detectLang(question);
    const bloodGroup = extractBloodGroup(question);
    const wantsDonor = isDonorIntent(question);
    const softDonor = bloodGroup && ['donor', 'rokto', 'blood', 'lagbe', 'dorkar', 'chai', 'রক্ত', 'দাতা', 'ডোনার'].some(w => question.toLowerCase().includes(w));
    if (!bloodGroup || (!wantsDonor && !softDonor)) return '';
    if (!state.donorsList || state.donorsList.length === 0) return '';

    const eligible = findEligibleDonors(bloodGroup);
    if (eligible.length) {
        return `\n\n--- DONOR RESULTS (include in reply if user asked for donors) ---\n${formatDonorResults(eligible, bloodGroup, lang)}\n--- END DONOR RESULTS ---`;
    }
    const fallback = findDonorsByGroup(bloodGroup);
    if (fallback.length) {
        return `\n\n--- DONOR RESULTS (include in reply if user asked for donors) ---\n${formatFallbackDonorResults(fallback, bloodGroup, lang)}\n--- END DONOR RESULTS ---`;
    }
    return '';
}

function getDonorListLoadingMessage(lang) {
    const searchHref = getSearchHref();
    if (lang === 'bangla') {
        return `ডোনার তালিকা লোড হচ্ছে... একটু পর আবার চেষ্টা করুন। 📋 আপনি চাইলে <a href="${searchHref}" style="color:#dc2626;font-weight:600">ডোনার সার্চ পেজ</a> এও দেখতে পারেন।`;
    }
    if (lang === 'banglish') {
        return `Donor list load hocche... ektu pore abar try korun. 📋 Chaile <a href="${searchHref}" style="color:#dc2626;font-weight:600">Donor Search page</a> e dekhe nite পারেন।`;
    }
    return `Donor list is loading... please try again in a moment. 📋 You can also check the <a href="${searchHref}" style="color:#dc2626;font-weight:600">Donor Search page</a>.`;
}

const SITE_LINKS = {
    about: getPageHref('about.html'),
    guide: getPageHref('donationGuide.html'),
    events: getPageHref('events.html'),
    join: getPageHref('join.html'),
    search: getPageHref('search.html'),
    profile: getPageHref('profile.html'),
    contact: getContactHref()
};
const KNOWLEDGE_BASE = [
    
    { keywords: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good night', 'howdy', 'sup', 'yo'],
      answer: 'Hello! 👋 I\'m your Blood Donation Assistant. I can help you with blood donation info — eligibility, blood types, preparation tips, health advice, and much more. Ask me anything!',
            answerBn: 'হ্যালো! 👋 আমি আপনার রক্তদান সহকারী। আমি রক্তদান সম্পর্কে সাহায্য করতে পারি — যোগ্যতা, রক্তের গ্রুপ, প্রস্তুতির টিপস, স্বাস্থ্য পরামর্শ এবং আরও অনেক কিছু। যেকোনো প্রশ্ন করুন!',
            answerBl: 'Hi! 👋 Ami Blood Donation Assistant. Blood donation info, eligibility, blood group, preparation tips, health advice—sob niye help korte pari. Je kono question korun!' },
    { keywords: ['assalamu', 'salam', 'আসসালামু', 'সালাম', 'ওয়ালাইকুম'],
      answer: 'Wa Alaikum Assalam! 🙏 I\'m your Blood Donation Assistant. How can I help you today?',
            answerBn: 'ওয়ালাইকুম আসসালাম! 🙏 আমি আপনার রক্তদান সহকারী। আজ কীভাবে সাহায্য করতে পারি?',
            answerBl: 'Walaikum assalam! 🙏 Ami Blood Donation Assistant. Aj kivabe help korte pari?' },
    { keywords: ['হ্যালো', 'হাই', 'হেই', 'শুভ সকাল', 'শুভ সন্ধ্যা', 'কেমন আছ', 'কেমন আছেন', 'কি খবর', 'কি অবস্থা'],
      answer: 'Hello! 👋 I\'m your Blood Donation Assistant. How can I assist you?',
            answerBn: 'হ্যালো! 👋 আমি আপনার রক্তদান সহকারী। কীভাবে সাহায্য করতে পারি?',
            answerBl: 'Hello! 👋 Ami Blood Donation Assistant. Kivabe help korte pari?' },
    { keywords: ['how are you', 'how r u', 'hows it going', 'whats up'],
      answer: 'I\'m doing great, thanks for asking! 😊 I\'m always ready to help with blood donation questions. What would you like to know?',
            answerBn: 'আমি ভালো আছি, ধন্যবাদ! 😊 রক্তদান সম্পর্কে যেকোনো প্রশ্ন করুন।',
            answerBl: 'Bhalo achi, thanks! 😊 Blood donation niye je kono question thakle bolun.' },
    { keywords: ['ভালো আছি', 'ভাল আছি', 'আলহামদুলিল্লাহ'],
      answer: 'Great to hear! How can I help you with blood donation today?',
            answerBn: 'শুনে ভালো লাগলো! আজ রক্তদান নিয়ে কী জানতে চান?',
            answerBl: 'Shune bhalo laglo! Aj blood donation niye ki jante chan?' },

        
        { keywords: ['who are you', 'who r u', 'who are u', 'আপনি কে', 'তুমি কে', 'কে তুমি'],
            answer: 'I am BAUET Blood Donation Assistant.',
            answerBn: 'আমি BAUET Blood Donation Assistant।',
            answerBl: 'Ami BAUET Blood Donation Assistant.' },
        { keywords: ['what can you do', 'what do you do', 'can you do', 'আপনি কি করতে পারেন', 'তুমি কি করতে পারো'],
            answer: 'I can help with donor search, blood donation information, and website guidance.',
            answerBn: 'আমি ডোনার খোঁজা, রক্তদান সম্পর্কিত তথ্য এবং ওয়েবসাইট নির্দেশনায় সাহায্য করতে পারি।',
            answerBl: 'Ami donor search, blood donation info ebong website guidance e help korte pari.' },

    
    { keywords: ['thank', 'thanks', 'thx', 'ty', 'appreciate'],
      answer: 'You\'re welcome! 😊 If you have more questions about blood donation, feel free to ask. Remember — every donation can save up to 3 lives! ❤️',
            answerBn: 'স্বাগতম! 😊 রক্তদান নিয়ে আরও প্রশ্ন থাকলে জিজ্ঞাসা করুন। মনে রাখবেন — একটি রক্তদানে ৩টি জীবন বাঁচতে পারে! ❤️',
            answerBl: 'Welcome! 😊 Blood donation niye aro question thakle bolun. Mone rakhben—ekta donation diye 3 ta jibon bachte pare! ❤️' },
    { keywords: ['ধন্যবাদ', 'ধন্যবাদ', 'শুক্রিয়া', 'জাযাকাল্লাহ'],
      answer: 'You\'re welcome! ❤️',
            answerBn: 'আপনাকেও ধন্যবাদ! 😊 রক্তদান নিয়ে আরও কিছু জানতে চাইলে নির্দ্বিধায় জিজ্ঞাসা করুন। ❤️',
            answerBl: 'Apnakeo thanks! 😊 Blood donation niye aro kichu jante chaile nirdidhay bolun. ❤️' },

    
    { keywords: ['who can donate', 'eligible', 'eligibility', 'can i donate', 'requirements', 'criteria', 'qualify'],
    answer: 'Generally, anyone aged 18–65, weighing at least 50 kg (110 lbs), and in good health can donate blood. You must not have donated in the last 120 days (about 4 months). Conditions like recent surgery, pregnancy, certain medications, or chronic illnesses may temporarily or permanently defer you.',
    answerBn: 'সাধারণত ১৮-৬৫ বছর বয়সী, কমপক্ষে ৫০ কেজি ওজনের এবং সুস্থ যেকোনো ব্যক্তি রক্তদান করতে পারেন। শেষ রক্তদানের পর কমপক্ষে ১২০ দিন (প্রায় ৪ মাস) অপেক্ষা করতে হবে। সাম্প্রতিক অস্ত্রোপচার, গর্ভাবস্থা, কিছু ওষুধ বা দীর্ঘস্থায়ী রোগ সাময়িক বা স্থায়ীভাবে বাধা হতে পারে।',
    answerBl: 'Generally 18-65 age, weight 50kg+, ebong healthy hole blood donate kora jay. Last donation theke 120 din gap lagbe. Surgery/pregnancy/medication/long-term illness thakle temporarily wait korte hoy.' },
    { keywords: ['কে দিতে পারে', 'যোগ্যতা', 'রক্তদান করতে পারব', 'রক্ত দিতে পারবো', 'আমি কি দিতে পারি', 'কি কি লাগে', 'শর্ত'],
    answer: 'Anyone aged 18-65, at least 50 kg, and in good health can donate. Must wait 120 days between donations.',
    answerBn: '১৮-৬৫ বছর বয়সী, কমপক্ষে ৫০ কেজি ওজনের এবং সুস্থ যেকোনো ব্যক্তি রক্তদান করতে পারেন। দুটি রক্তদানের মধ্যে কমপক্ষে ১২০ দিন (প্রায় ৪ মাস) বিরতি থাকতে হবে।' },

    
    { keywords: ['blood type', 'blood group', 'types of blood', 'how many blood groups', 'blood groups list'],
      answer: 'There are 8 main blood types: A+, A-, B+, B-, O+, O-, AB+, AB-. These are determined by the ABO system and the Rh factor. O- is the universal donor (can give to all), and AB+ is the universal recipient (can receive from all).',
            answerBn: '৮টি প্রধান রক্তের গ্রুপ আছে: A+, A-, B+, B-, O+, O-, AB+, AB-। এগুলো ABO সিস্টেম এবং Rh ফ্যাক্টর দ্বারা নির্ধারিত হয়। O- হলো সার্বজনীন দাতা (সবাইকে দিতে পারে) এবং AB+ হলো সার্বজনীন গ্রহীতা (সবার থেকে নিতে পারে)।',
            answerBl: '8 ta main blood group: A+, A-, B+, B-, O+, O-, AB+, AB-. O- universal donor, AB+ universal recipient.' },
    { keywords: ['রক্তের গ্রুপ', 'ব্লাড গ্রুপ', 'কত ধরনের রক্ত', 'গ্রুপ কয়টি', 'রক্তের প্রকার'],
      answer: 'There are 8 blood types: A+, A-, B+, B-, O+, O-, AB+, AB-.',
      answerBn: '৮টি প্রধান রক্তের গ্রুপ: A+, A-, B+, B-, O+, O-, AB+, AB-। O- সার্বজনীন দাতা এবং AB+ সার্বজনীন গ্রহীতা।' },

    
    { keywords: ['how often', 'frequency', 'how many times', 'gap between', 'interval', 'কতদিন পর', 'কতবার', 'বিরতি'],
    answer: 'You can donate whole blood every 120 days (about 4 months). Platelet donations can be made every 7 days, up to 24 times a year. Double red cell donations can be made every 168 days.',
    answerBn: 'প্রতি ১২০ দিন (প্রায় ৪ মাস) পর পর সম্পূর্ণ রক্তদান করা যায়। প্লেটলেট দান প্রতি ৭ দিনে করা যায়, বছরে সর্বোচ্চ ২৪ বার। ডাবল রেড সেল দান প্রতি ১৬৮ দিনে করা যায়।' },

    
    { keywords: ['benefits', 'why donate', 'advantage', 'good for health', 'healthy', 'কেন দেব', 'উপকারিতা', 'সুবিধা', 'লাভ'],
      answer: 'Blood donation has many benefits: saves up to 3 lives per donation, stimulates new blood cell production, reduces iron overload, provides a free health checkup, may lower heart disease risk, and gives a great sense of fulfillment! 💪',
      answerBn: 'রক্তদানের অনেক উপকারিতা রয়েছে: একটি দানে ৩টি জীবন বাঁচে, নতুন রক্তকোষ তৈরি হয়, অতিরিক্ত আয়রন কমে, বিনামূল্যে স্বাস্থ্য পরীক্ষা হয়, হৃদরোগের ঝুঁকি কমতে পারে এবং মানসিক প্রশান্তি পাওয়া যায়! 💪' },

    
    { keywords: ['prepare', 'before donat', 'preparation', 'what to do before', 'tips before', 'প্রস্তুতি', 'কি করব আগে', 'দানের আগে'],
      answer: 'Before donating: 1) Eat a healthy meal 2-3 hours before, 2) Drink plenty of water (at least 500ml extra), 3) Avoid fatty foods, 4) Get good sleep, 5) Bring a valid ID, 6) Wear comfortable clothing. Avoid alcohol for 24 hours.',
            answerBn: 'রক্তদানের আগে: ১) ২-৩ ঘণ্টা আগে পুষ্টিকর খাবার খান, ২) প্রচুর পানি পান করুন (কমপক্ষে ৫০০মিলি অতিরিক্ত), ৩) চর্বিযুক্ত খাবার এড়িয়ে চলুন, ৪) ভালো ঘুম নিন, ৫) বৈধ পরিচয়পত্র নিন, ৬) আরামদায়ক পোশাক পরুন। ২৪ ঘণ্টা আগে মদ্যপান এড়িয়ে চলুন।',
            answerBl: 'Donation er age: 2-3 ghonta age bhalo khabar, extra pani, fatty food avoid, bhalo ghum, valid ID, comfortable dress. Alcohol 24 ghonta avoid.' },
    { keywords: ['donation tips', 'blood donation tips', 'donation advice', 'give me tips', 'tips for donation', 'tips', 'রক্তদানের টিপস', 'পরামর্শ'],
      answer: 'Here are some practical donation tips: 1) Sleep well the night before, 2) Eat a balanced meal 2-3 hours before donating, 3) Drink extra water, 4) Avoid oily food and alcohol, 5) Wear a shirt with sleeves that roll up easily, 6) Rest for 10-15 minutes after donating, 7) Drink fluids and avoid heavy exercise for the rest of the day.',
            answerBn: 'রক্তদানের জন্য কিছু দরকারি টিপস: ১) আগের রাতে ভালো ঘুমান, ২) দানের ২-৩ ঘণ্টা আগে হালকা ও পুষ্টিকর খাবার খান, ৩) বেশি পানি পান করুন, ৪) তেলযুক্ত খাবার ও অ্যালকোহল এড়িয়ে চলুন, ৫) সহজে গোটানো যায় এমন জামা পরুন, ৬) দানের পর ১০-১৫ মিনিট বিশ্রাম নিন, ৭) সারা দিন বেশি তরল পান করুন এবং ভারী ব্যায়াম এড়িয়ে চলুন।',
            answerBl: 'Donation er jonno kichu useful tips: 1) Age raat e bhalo ghum, 2) 2-3 ghonta age healthy khabar, 3) Beshi pani, 4) Oily food ar alcohol avoid, 5) Easy sleeve er dress porun, 6) Donation er por 10-15 min rest, 7) Sara din fluid nin ar heavy exercise avoid korun.' },

    
    { keywords: ['after donat', 'post donation', 'after giving blood', 'side effects', 'what to do after', 'দানের পরে', 'পরে কি করব', 'পার্শ্বপ্রতিক্রিয়া'],
      answer: 'After donating: 1) Rest 10-15 minutes, 2) Drink extra fluids for 24-48 hours, 3) Avoid heavy lifting for 24 hours, 4) Keep bandage on for 4+ hours, 5) Eat iron-rich foods. Minor dizziness is normal and temporary.',
            answerBn: 'রক্তদানের পরে: ১) ১০-১৫ মিনিট বিশ্রাম নিন, ২) ২৪-৪৮ ঘণ্টা বেশি তরল পান করুন, ৩) ২৪ ঘণ্টা ভারী কাজ এড়িয়ে চলুন, ৪) ব্যান্ডেজ ৪+ ঘণ্টা রাখুন, ৫) আয়রন সমৃদ্ধ খাবার খান। হালকা মাথা ঘোরা স্বাভাবিক এবং সাময়িক।',
            answerBl: 'Donation er pore 10-15 min rest, 24-48 ghonta beshi pani, 24 ghonta heavy lifting avoid, bandage 4+ hour, iron-rich food. Halka dizziness normal.' },

    
    { keywords: ['how long', 'duration', 'time take', 'how much time', 'কতক্ষণ', 'সময় লাগে'],
      answer: 'The actual blood draw takes about 8-10 minutes. Including registration, screening, and rest, the whole process takes about 45-60 minutes.',
      answerBn: 'প্রকৃত রক্ত নেওয়া হয় ৮-১০ মিনিটে। নিবন্ধন, পরীক্ষা এবং বিশ্রামসহ পুরো প্রক্রিয়ায় প্রায় ৪৫-৬০ মিনিট সময় লাগে।' },

    
    { keywords: ['pain', 'hurt', 'painful', 'needle', 'does it hurt', 'ব্যথা', 'কষ্ট', 'সুই', 'ব্যথা হয়'],
      answer: 'You\'ll feel a brief pinch when the needle is inserted, but it\'s generally not painful. Most donors say it\'s much easier than expected! If you feel discomfort, let the staff know immediately.',
      answerBn: 'সুই ঢোকানোর সময় সামান্য চিমটির মতো লাগবে, কিন্তু সাধারণত ব্যথা হয় না। বেশিরভাগ দাতা বলেন এটি তাদের ধারণার চেয়ে অনেক সহজ! অস্বস্তি হলে কর্মীদের জানান।' },

    
    { keywords: ['universal donor', 'universal recipient', 'O negative', 'AB positive', 'সার্বজনীন দাতা', 'সার্বজনীন গ্রহীতা'],
      answer: 'O- (O negative) is the universal donor — can give red blood cells to anyone. AB+ (AB positive) is the universal recipient — can receive from any blood type. In emergencies, O- is used when the patient\'s blood type is unknown.',
      answerBn: 'O- (ও নেগেটিভ) হলো সার্বজনীন দাতা — যেকোনো রক্তের গ্রুপকে দিতে পারে। AB+ (এবি পজিটিভ) হলো সার্বজনীন গ্রহীতা — যেকোনো গ্রুপ থেকে নিতে পারে। জরুরি অবস্থায় রোগীর গ্রুপ অজানা থাকলে O- ব্যবহার হয়।' },

    
    { keywords: ['compatible', 'compatibility', 'who can receive', 'who can give', 'matching', 'সামঞ্জস্য', 'কে কাকে দিতে পারে', 'ম্যাচিং'],
      answer: 'O- can give to all; O+ to A+, B+, AB+, O+; A- to A+, A-, AB+, AB-; A+ to A+, AB+; B- to B+, B-, AB+, AB-; B+ to B+, AB+; AB- to AB+, AB-; AB+ to AB+ only.',
      answerBn: 'O- সবাইকে দিতে পারে; O+ দিতে পারে A+, B+, AB+, O+ কে; A- দিতে পারে A+, A-, AB+, AB- কে; A+ দিতে পারে A+, AB+ কে; B- দিতে পারে B+, B-, AB+, AB- কে; B+ দিতে পারে B+, AB+ কে; AB- দিতে পারে AB+, AB- কে; AB+ শুধু AB+ কে।' },

    
    { keywords: ['platelet', 'plasma', 'types of donation', 'donation types', 'component', 'প্লেটলেট', 'প্লাজমা', 'দানের ধরন'],
      answer: 'Types: 1) Whole Blood — most common, 8-10 min. 2) Platelets (Apheresis) — for cancer patients, ~2 hours. 3) Plasma — for burn/trauma patients. 4) Double Red Cells — collects twice the red cells.',
      answerBn: 'প্রকারভেদ: ১) সম্পূর্ণ রক্ত — সবচেয়ে সাধারণ, ৮-১০ মিনিট। ২) প্লেটলেট — ক্যান্সার রোগীদের জন্য, ~২ ঘণ্টা। ৩) প্লাজমা — পোড়া/ট্রমা রোগীদের জন্য। ৪) ডাবল রেড সেল — দ্বিগুণ লোহিত কণিকা সংগ্রহ।' },

    
    { keywords: ['iron', 'hemoglobin', 'anemia', 'low iron', 'আয়রন', 'হিমোগ্লোবিন', 'রক্তস্বল্পতা'],
      answer: 'Hemoglobin is checked before every donation. Men need at least 13 g/dL; women 12.5 g/dL. Eat iron-rich foods (red meat, spinach, beans, fortified cereals) and vitamin C to maintain levels.',
      answerBn: 'প্রতিবার দানের আগে হিমোগ্লোবিন পরীক্ষা করা হয়। পুরুষদের কমপক্ষে ১৩ g/dL এবং মহিলাদের ১২.৫ g/dL প্রয়োজন। আয়রন সমৃদ্ধ খাবার (মাংস, পালং শাক, ডাল) এবং ভিটামিন সি খান।' },

    
    { keywords: ['tattoo', 'piercing', 'can i donate with tattoo', 'ট্যাটু', 'পিয়ার্সিং'],
      answer: 'You can donate if your tattoo/piercing was done at a regulated facility with sterile equipment. Some banks require a 3-12 month wait. Check with your local blood bank.',
      answerBn: 'জীবাণুমুক্ত সরঞ্জাম দিয়ে নিয়ন্ত্রিত জায়গায় ট্যাটু/পিয়ার্সিং করা হলে রক্তদান করতে পারবেন। কিছু রক্ত ব্যাংক ৩-১২ মাস অপেক্ষা চায়। স্থানীয় রক্ত ব্যাংকে জিজ্ঞাসা করুন।' },

    
    { keywords: ['medication', 'medicine', 'drugs', 'on medication', 'ওষুধ', 'মেডিসিন', 'ঔষধ খেলে'],
      answer: 'Many medications are fine. Blood thinners (aspirin — wait 48 hrs), antibiotics (wait till course ends), Accutane (1 month wait) may require deferral. Always disclose all medications.',
      answerBn: 'অনেক ওষুধ চলাকালীন দান করা যায়। রক্ত পাতলা করার ওষুধ (অ্যাসপিরিন — ৪৮ ঘণ্টা অপেক্ষা), অ্যান্টিবায়োটিক (কোর্স শেষ হওয়া পর্যন্ত অপেক্ষা) বাধা হতে পারে। সব ওষুধের কথা জানান।' },

        
        { keywords: ['blood pressure', 'high bp', 'low bp', 'hypertension', 'hypotension', 'pressure', 'bp', 'রক্তচাপ', 'প্রেশার', 'উচ্চ রক্তচাপ', 'লো রক্তচাপ', 'হাই প্রেসার', 'লো প্রেসার'],
            answer: 'If your blood pressure is well controlled and you feel fine, you can usually donate. Very high or very low BP, dizziness, or recent medication changes mean you should wait. Always tell the staff about your BP history and medicines.',
            answerBn: 'রক্তচাপ নিয়ন্ত্রণে থাকলে এবং আপনি ভালো বোধ করলে সাধারণত রক্তদান করা যায়। খুব বেশি বা খুব কম চাপ, মাথা ঘোরা বা নতুন ওষুধ শুরু করলে অপেক্ষা করা ভালো। স্টাফকে অবশ্যই BP ইতিহাস ও ওষুধ জানান।' },

        
        { keywords: ['period', 'menstruation', 'mens', 'monthly cycle', 'মাসিক', 'পিরিয়ড', 'মাসিক চলছে', 'মেনস্ট্রুয়েশন'],
            answer: 'You can donate during your period if you feel well and your hemoglobin is okay. If you have heavy bleeding, severe pain, or feel weak, wait until you recover.',
            answerBn: 'মাসিক চলাকালীন ভালো লাগলে এবং হিমোগ্লোবিন ঠিক থাকলে রক্তদান করা যায়। বেশি রক্তপাত, তীব্র ব্যথা বা দুর্বলতা থাকলে সেরে ওঠার পরে দিন।' },

        
        { keywords: ['fever', 'infection', 'flu', 'cold', 'viral', 'dengue', 'typhoid', 'malaria', 'hepatitis', 'jaundice', 'জ্বর', 'ইনফেকশন', 'ডেঙ্গু', 'টাইফয়েড', 'ম্যালেরিয়া', 'হেপাটাইটিস', 'জন্ডিস', 'ভাইরাল'],
            answer: 'Do not donate while you have fever or infection. Donate only after you are fully recovered and off antibiotics. For dengue, typhoid, malaria, or hepatitis, blood banks often require a longer wait — check with your local blood bank.',
            answerBn: 'জ্বর/ইনফেকশন থাকলে রক্তদান করবেন না। সম্পূর্ণ সুস্থ হয়ে এবং অ্যান্টিবায়োটিক শেষ হওয়ার পরে দান করুন। ডেঙ্গু/টাইফয়েড/ম্যালেরিয়া/হেপাটাইটিস হলে অনেক ক্ষেত্রে দীর্ঘ বিরতি লাগে — স্থানীয় ব্লাড ব্যাংকের নিয়ম জেনে নিন।' },

        
        { keywords: ['surgery', 'operation', 'dental', 'tooth extraction', 'procedure', 'অপারেশন', 'সার্জারি', 'ডেন্টাল', 'দাঁত তোলা', 'প্রসিডিউর'],
            answer: 'After surgery or dental procedures, wait until the wound is fully healed and you are off antibiotics or pain medicines. The waiting period depends on the procedure — ask your doctor or blood bank.',
            answerBn: 'অপারেশন বা ডেন্টাল কাজের পরে ক্ষত সম্পূর্ণ শুকানো এবং অ্যান্টিবায়োটিক/পেইনকিলার শেষ হলে দান করুন। অপেক্ষার সময় অপারেশনের ধরন অনুযায়ী ভিন্ন — ডাক্তার বা ব্লাড ব্যাংকে জেনে নিন।' },

        
        { keywords: ['how much blood', 'how many ml', 'amount of blood', 'blood volume', 'কত মিলি', 'কত রক্ত', 'পরিমাণ', 'রক্তের পরিমাণ'],
            answer: 'A typical donation is about 350–450 ml depending on your weight and local guidelines. It is safe for healthy donors, and your body replaces the volume quickly.',
            answerBn: 'সাধারণত ৩৫০–৪৫০ মি.লি. রক্ত নেওয়া হয় (ওজন ও নিয়ম অনুযায়ী)। সুস্থ দাতার জন্য এটি নিরাপদ এবং শরীর দ্রুত পূরণ করে।' },

        
        { keywords: ['safe', 'risk', 'infection risk', 'needle safety', 'sterile', 'নিরাপদ', 'ঝুঁকি', 'ইনফেকশন ঝুঁকি', 'সুই', 'নিডল'],
            answer: 'Blood donation is very safe. Single-use sterile needles are used and cannot be reused. Most people feel fine; minor dizziness can happen and goes away with rest and fluids.',
            answerBn: 'রক্তদান অত্যন্ত নিরাপদ। একবার ব্যবহারযোগ্য জীবাণুমুক্ত সূঁচ ব্যবহার করা হয় এবং পুনঃব্যবহার হয় না। বেশিরভাগ মানুষ ঠিক থাকেন; সামান্য মাথা ঘোরা হলে বিশ্রাম ও পানি পান করলে ঠিক হয়ে যায়।' },

    
    { keywords: ['diabetes', 'diabetic', 'sugar', 'ডায়াবেটিস', 'সুগার', 'বহুমূত্র'],
      answer: 'Diabetics can usually donate if their condition is well-controlled. Both Type 1 and Type 2 may be eligible. Blood sugar should be normal at donation time. Insulin alone doesn\'t disqualify.',
      answerBn: 'ডায়াবেটিস নিয়ন্ত্রণে থাকলে সাধারণত রক্তদান করা যায়। টাইপ ১ ও টাইপ ২ উভয়ই যোগ্য হতে পারেন। দানের সময় রক্তের সুগার স্বাভাবিক থাকতে হবে। ইনসুলিন নেওয়া বাধা নয়।' },

    
    { keywords: ['pregnancy', 'pregnant', 'breastfeeding', 'nursing', 'গর্ভবতী', 'গর্ভাবস্থা', 'বুকের দুধ', 'স্তন্যদান'],
      answer: 'Pregnant women cannot donate. Wait at least 6 weeks after giving birth. Breastfeeding mothers are generally eligible, but best to wait until baby is 6 months old.',
      answerBn: 'গর্ভবতী মহিলারা রক্তদান করতে পারবেন না। প্রসবের পর কমপক্ষে ৬ সপ্তাহ অপেক্ষা করুন। স্তন্যদানকারী মায়েরা সাধারণত যোগ্য, তবে শিশুর ৬ মাস বয়স পর্যন্ত অপেক্ষা করা ভালো।' },

    
    { keywords: ['storage', 'shelf life', 'how long blood stored', 'expiry', 'সংরক্ষণ', 'কতদিন রাখা যায়', 'মেয়াদ'],
      answer: 'Whole blood: 42 days refrigerated. Platelets: 5 days (room temp). Plasma: up to 1 year frozen. Red blood cells: up to 10 years frozen.',
      answerBn: 'সম্পূর্ণ রক্ত: ফ্রিজে ৪২ দিন। প্লেটলেট: ৫ দিন (ঘরের তাপমাত্রায়)। প্লাজমা: হিমায়িত অবস্থায় ১ বছর পর্যন্ত। লোহিত কণিকা: হিমায়িত অবস্থায় ১০ বছর পর্যন্ত।' },

    
    { keywords: ['covid', 'coronavirus', 'vaccination', 'vaccine', 'কোভিড', 'করোনা', 'টিকা', 'ভ্যাকসিন'],
      answer: 'You can donate after most COVID-19 vaccines with no waiting period (Pfizer, Moderna, AstraZeneca). After COVID infection, wait 14 days after symptoms fully resolve.',
      answerBn: 'বেশিরভাগ কোভিড-১৯ টিকা নেওয়ার পর অপেক্ষা ছাড়াই রক্তদান করা যায়। কোভিড সংক্রমণের পর লক্ষণ সম্পূর্ণ সেরে যাওয়ার ১৪ দিন পর দান করতে পারবেন।' },

    
    { keywords: ['weight', 'minimum weight', 'how heavy', 'ওজন', 'কত কেজি', 'ন্যূনতম ওজন'],
      answer: 'Minimum weight is typically 50 kg (110 lbs). This ensures enough blood volume to safely donate ~450-500 ml.',
            answerBn: 'ন্যূনতম ওজন সাধারণত ৫০ কেজি (১১০ পাউন্ড)। এটি নিরাপদে ~৪৫০-৫০০ মিলি রক্তদানের জন্য পর্যাপ্ত রক্তের পরিমাণ নিশ্চিত করে।',
            answerBl: 'Minimum weight typically 50kg. Eta safe bhabe ~450-500ml blood donate korar jonno enough volume ensure kore.' },

    
    { keywords: ['age', 'minimum age', 'maximum age', 'how old', 'age limit', 'বয়স', 'কত বছর', 'বয়সসীমা'],
      answer: 'Minimum age: 18 years (16-17 with parental consent in some places). Upper limit: usually 65, some places have no upper limit if healthy.',
            answerBn: 'ন্যূনতম বয়স: ১৮ বছর (কিছু জায়গায় ১৬-১৭ অভিভাবকের সম্মতিতে)। সর্বোচ্চ বয়স: সাধারণত ৬৫, কিছু জায়গায় সুস্থ থাকলে সীমা নেই।',
            answerBl: 'Minimum age 18 (kichu jaygay 16-17 parental consent). Upper limit usually 65, healthy hole kichu place e limit nai.' },

    
    { keywords: ['emergency', 'urgent', 'need blood', 'blood needed', 'জরুরি', 'রক্ত দরকার', 'রক্ত লাগবে', 'রক্ত প্রয়োজন'],
      answer: 'In emergencies: 1) Contact nearest hospital blood bank, 2) Use our "Search Donors" page to find donors by blood group, 3) Share on social media, 4) Contact local blood donation organizations.',
            answerBn: 'জরুরি অবস্থায়: ১) নিকটস্থ হাসপাতালের ব্লাড ব্যাংকে যোগাযোগ করুন, ২) আমাদের "ডোনার খুঁজুন" পেজে রক্তের গ্রুপ অনুযায়ী দাতা খুঁজুন, ৩) সোশ্যাল মিডিয়ায় শেয়ার করুন, ৪) স্থানীয় রক্তদান সংগঠনে যোগাযোগ করুন।',
            answerBl: 'Emergency hole: 1) Nearest hospital blood bank e contact, 2) "Search Donors" page diye donor khujen, 3) Social media te share, 4) Local blood donation org e contact.' },

    
    { keywords: ['motivation', 'inspire', 'why should i', 'scared', 'nervous', 'fear', 'ভয়', 'উৎসাহ', 'অনুপ্রেরণা', 'কেন করব', 'ভয় লাগে'],
      answer: 'Every 2 seconds, someone needs blood. One donation saves up to 3 lives! 🩸 There\'s no substitute for human blood. By donating, you become a hero to a patient waiting for a chance to live. Your small act of courage creates a huge impact. Be brave, be a donor! 💪❤️',
      answerBn: 'প্রতি ২ সেকেন্ডে কারো রক্তের প্রয়োজন হয়। একটি দানে ৩টি জীবন বাঁচে! 🩸 মানুষের রক্তের কোনো বিকল্প নেই। রক্তদান করে আপনি একজন রোগীর জন্য আশার আলো হয়ে উঠবেন। আপনার ছোট সাহসী পদক্ষেপ বিশাল প্রভাব ফেলে। সাহসী হোন, রক্তদাতা হোন! 💪❤️' },

    
    { keywords: ['smoke', 'smoking', 'cigarette', 'ধূমপান', 'সিগারেট'],
      answer: 'Smokers can donate blood! Just avoid smoking for at least 1 hour before and after donation. This helps your body recover better.',
      answerBn: 'ধূমপায়ীরা রক্তদান করতে পারেন! শুধু দানের কমপক্ষে ১ ঘণ্টা আগে ও পরে ধূমপান এড়িয়ে চলুন। এটি শরীরের পুনরুদ্ধারে সাহায্য করে।' },

    
    { keywords: ['food', 'diet', 'eat', 'nutrition', 'what to eat', 'খাবার', 'কি খাব', 'খাদ্য', 'পুষ্টি'],
      answer: 'Before donation: eat iron-rich foods (red meat, spinach, lentils, beans). After: drink juice, eat snacks, have iron-rich meals. Avoid fatty foods before donating. Stay hydrated! 🥤',
      answerBn: 'দানের আগে: আয়রন সমৃদ্ধ খাবার খান (মাংস, পালং শাক, ডাল, শিম)। পরে: জুস পান করুন, স্ন্যাকস খান, আয়রন সমৃদ্ধ খাবার খান। দানের আগে চর্বিযুক্ত খাবার এড়িয়ে চলুন। পানি বেশি পান করুন! 🥤' },

    
    { keywords: ['what is blood donation', 'blood donation meaning', 'define', 'রক্তদান কি', 'রক্তদান কী', 'রক্তদান মানে'],
      answer: 'Blood donation is the voluntary act of giving your blood to help save others\' lives. The donated blood is used for transfusions, surgeries, accident victims, cancer patients, and people with blood disorders. It\'s one of the greatest gifts you can give! 🩸',
      answerBn: 'রক্তদান হলো অন্যের জীবন বাঁচাতে স্বেচ্ছায় নিজের রক্ত দেওয়ার মহৎ কাজ। দান করা রক্ত রক্ত সংযোজন, অস্ত্রোপচার, দুর্ঘটনার শিকার, ক্যান্সার রোগী এবং রক্তের রোগে আক্রান্তদের জন্য ব্যবহার হয়। এটি সবচেয়ে মূল্যবান উপহারগুলোর একটি! 🩸' },

    
        { keywords: ['this website', 'this site', 'blood donation community', 'your community', 'এই ওয়েবসাইট', 'এই সাইট', 'তোমাদের কমিউনিটি'],
            answer: 'BAUET BDC is a volunteer-driven platform that connects blood donors with patients in need. You can join as a donor, search for donors by blood group, view events, and get your donor card! Visit our Search page to find donors near you.',
      answerBn: 'ব্লাড ডোনেশন কমিউনিটি একটি স্বেচ্ছাসেবী প্ল্যাটফর্ম যা রক্তদাতা ও রোগীদের সংযুক্ত করে। আপনি দাতা হিসেবে যোগ দিতে পারেন, রক্তের গ্রুপ অনুযায়ী দাতা খুঁজতে পারেন, ইভেন্ট দেখতে পারেন এবং ডোনার কার্ড পেতে পারেন! আমাদের সার্চ পেজে দাতা খুঁজুন।' },

        { keywords: ['contact', 'email', 'phone', 'whatsapp', 'contact info', 'যোগাযোগ', 'ইমেইল', 'ফোন', 'হোয়াটসঅ্যাপ'],
            answer: `You can contact us via email: <a href="mailto:bauet.bdc@gmail.com">bauet.bdc@gmail.com</a> or phone: <a href="tel:+8801712460423">+8801712460423</a>. WhatsApp: <a href="https://wa.me/8801712460423" target="_blank" rel="noopener">Chat now</a>. You can also use the Contact section: <a href="${SITE_LINKS.contact}" style="color:#dc2626;font-weight:600">Contact</a>.`,
            answerBn: `আপনি ইমেইল করতে পারেন: <a href="mailto:bauet.bdc@gmail.com">bauet.bdc@gmail.com</a> অথবা ফোন করুন: <a href="tel:+8801712460423">+8801712460423</a>। WhatsApp: <a href="https://wa.me/8801712460423" target="_blank" rel="noopener">Chat now</a>। চাইলে Contact সেকশনও দেখতে পারেন: <a href="${SITE_LINKS.contact}" style="color:#dc2626;font-weight:600">Contact</a>।`,
            answerBl: `Email: <a href="mailto:bauet.bdc@gmail.com">bauet.bdc@gmail.com</a>, phone: <a href="tel:+8801712460423">+8801712460423</a>. WhatsApp: <a href="https://wa.me/8801712460423" target="_blank" rel="noopener">Chat now</a>. Contact section: <a href="${SITE_LINKS.contact}" style="color:#dc2626;font-weight:600">Contact</a>.` },

        { keywords: ['join', 'register', 'sign up', 'become donor', 'join donor', 'register donor', 'নিবন্ধন', 'রেজিস্টার', 'ডোনার হব', 'যোগ দিতে', 'দাতা হব'],
            answer: `To join as a donor, fill out the registration form here: <a href="${SITE_LINKS.join}" style="color:#dc2626;font-weight:600">Join as Donor</a>. After signup, you can manage your profile anytime.`,
            answerBn: `ডোনার হিসেবে যোগ দিতে এই ফর্মটি পূরণ করুন: <a href="${SITE_LINKS.join}" style="color:#dc2626;font-weight:600">Join as Donor</a>। রেজিস্ট্রেশনের পর প্রোফাইল সহজেই ম্যানেজ করতে পারবেন।`,
            answerBl: `Donor hote form fill korun: <a href="${SITE_LINKS.join}" style="color:#dc2626;font-weight:600">Join as Donor</a>. Signup er por profile manage korte parben.` },

        { keywords: ['search donor', 'find donor', 'donor search', 'donor list', 'ডোনার খুঁজ', 'রক্ত খুঁজ', 'সার্চ ডোনার'],
            answer: `You can search donors by blood group here: <a href="${SITE_LINKS.search}" style="color:#dc2626;font-weight:600">Search Donors</a>.`,
            answerBn: `রক্তের গ্রুপ অনুযায়ী ডোনার খুঁজতে এখানে যান: <a href="${SITE_LINKS.search}" style="color:#dc2626;font-weight:600">Search Donors</a>।`,
            answerBl: `Blood group diye donor search korte: <a href="${SITE_LINKS.search}" style="color:#dc2626;font-weight:600">Search Donors</a>.` },

        { keywords: ['events', 'blood camp', 'campaign', 'program', 'ইভেন্ট', 'ক্যাম্প', 'অনুষ্ঠান'],
            answer: `Upcoming donation events are listed here: <a href="${SITE_LINKS.events}" style="color:#dc2626;font-weight:600">Events</a>.`,
            answerBn: `আসন্ন রক্তদান ইভেন্টগুলো এখানে পাওয়া যাবে: <a href="${SITE_LINKS.events}" style="color:#dc2626;font-weight:600">Events</a>।` },

        { keywords: ['donation guide', 'how to donate', 'guideline', 'guide', 'নির্দেশনা', 'গাইড', 'কিভাবে রক্ত দিব'],
            answer: `See the full donation guide here: <a href="${SITE_LINKS.guide}" style="color:#dc2626;font-weight:600">Donation Guide</a>.`,
            answerBn: `রক্তদান সম্পর্কিত নির্দেশনা এখানে: <a href="${SITE_LINKS.guide}" style="color:#dc2626;font-weight:600">Donation Guide</a>।`,
            answerBl: `Donation guide er jonno: <a href="${SITE_LINKS.guide}" style="color:#dc2626;font-weight:600">Donation Guide</a>.` },

        { keywords: ['profile', 'update profile', 'edit profile', 'change info', 'প্রোফাইল', 'প্রোফাইল আপডেট', 'তথ্য পরিবর্তন'],
            answer: `You can update your donor profile after login here: <a href="${SITE_LINKS.profile}" style="color:#dc2626;font-weight:600">My Profile</a>.`,
            answerBn: `লগইন করার পরে আপনার প্রোফাইল আপডেট করুন এখানে: <a href="${SITE_LINKS.profile}" style="color:#dc2626;font-weight:600">My Profile</a>।` },

        { keywords: ['certificate', 'donor card', 'id card', 'সার্টিফিকেট', 'ডোনার কার্ড', 'আইডি কার্ড'],
            answer: `After login, you can generate your certificate or donor card from your profile: <a href="${SITE_LINKS.profile}" style="color:#dc2626;font-weight:600">My Profile</a>.`,
            answerBn: `লগইন করার পরে আপনার সার্টিফিকেট বা ডোনার কার্ড প্রোফাইল থেকে জেনারেট করতে পারবেন: <a href="${SITE_LINKS.profile}" style="color:#dc2626;font-weight:600">My Profile</a>।` },

        { keywords: ['feedback', 'suggestion', 'complain', 'message', 'মতামত', 'ফিডব্যাক', 'পরামর্শ', 'অভিযোগ'],
            answer: 'You can share feedback from the footer button “Share Feedback” on any page, or email us at <a href="mailto:bauet.bdc@gmail.com">bauet.bdc@gmail.com</a>.',
            answerBn: 'যেকোনো পেজের ফুটারে থাকা “Share Feedback” বাটন থেকে মতামত দিতে পারেন, অথবা ইমেইল করুন <a href="mailto:bauet.bdc@gmail.com">bauet.bdc@gmail.com</a>।' },

        { keywords: ['login', 'sign in', 'forgot password', 'reset password', 'পাসওয়ার্ড ভুলে', 'লগইন', 'সাইন ইন', 'পাসওয়ার্ড রিসেট'],
            answer: 'Click the Login button in the header and use “Forgot Password?” if needed. A reset link will be sent to your email.',
            answerBn: 'হেডারের Login বাটনে ক্লিক করুন এবং দরকার হলে “Forgot Password?” ব্যবহার করুন। আপনার ইমেইলে রিসেট লিংক পাঠানো হবে।' },

    
    { keywords: ['bye', 'goodbye', 'see you', 'বিদায়', 'আবার দেখা হবে', 'যাই'],
      answer: 'Goodbye! Take care and remember — donating blood saves lives! See you soon! 👋❤️',
      answerBn: 'বিদায়! ভালো থাকবেন এবং মনে রাখবেন — রক্তদান জীবন বাঁচায়! আবার দেখা হবে! 👋❤️' },
];

function scoreKBEntry(entry, queryWords, normalizedQuestion) {
    let score = 0;
    let matchCount = 0;
    for (const kw of entry.keywords) {
        const kwLower = kw.toLowerCase();
        const kwWords = kwLower.split(/\s+/).filter(Boolean);
        
        if (queryWords.includes(kwLower)) {
            score += kw.length * 2;
            matchCount++;
        }
        
        else if (normalizedQuestion.includes(kwLower)) {
            score += kw.length;
            matchCount++;
        } else {
            const wordOverlap = kwWords.filter((word) => queryWords.includes(word)).length;
            if (wordOverlap > 0) {
                score += wordOverlap * 1.5;
                if (wordOverlap === kwWords.length || wordOverlap >= 2) {
                    matchCount++;
                }
            }
        }
    }
    
    if (matchCount >= 2) score *= 1.3;
    if (matchCount >= 3) score *= 1.5;
    return { score, matchCount };
}

function getKBAnswer(entry, lang) {
    if (lang === 'bangla') return entry.answerBn || entry.answer;
    if (lang === 'banglish') {
        if (entry.answerBl) return entry.answerBl;
        return `Choto kore bolchi: ${entry.answer} (jodi specific kichu janar thake, bole din)`;
    }
    return entry.answer;
}

function searchKnowledgeBase(question) {
    const q = normalizeQuestionForKB(question);
    const lang = detectLang(question);
    const qWords = q.split(/\s+/).filter(w => w.length > 0);

    const greetingKeywords = ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good night', 'howdy', 'sup', 'yo', 'assalamu', 'salam', 'হ্যালো', 'হাই', 'হেই', 'শুভ সকাল', 'শুভ সন্ধ্যা', 'কেমন আছ', 'কেমন আছেন', 'আসসালামু', 'সালাম', 'ওয়ালাইকুম', 'how are you', 'how r u', 'ভালো আছি', 'ভাল আছি', 'আলহামদুলিল্লাহ', 'thank', 'thanks', 'thx', 'ty', 'appreciate', 'ধন্যবাদ', 'শুক্রিয়া', 'জাযাকাল্লাহ', 'bye', 'goodbye', 'see you', 'বিদায়', 'আবার দেখা হবে', 'যাই'];
    const isGreeting = greetingKeywords.some(kw => q.includes(kw));

    let bestMatch = null;
    let bestScore = 0;
    for (const entry of KNOWLEDGE_BASE) {
        const { score } = scoreKBEntry(entry, qWords, q);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }

    if (!bestMatch || bestScore < 3) return null;

    const answer = getKBAnswer(bestMatch, lang);
    return { answer, score: bestScore, isGreeting };
}

function shouldUseDirectKBFallback(question, kbResult) {
    if (!kbResult) return false;
    const q = question.toLowerCase();
    if (kbResult.isGreeting) return true;

    const directIntentKeywords = [
        'who are you', 'what can you do', 'contact', 'email', 'phone', 'whatsapp',
        'join', 'register', 'sign up', 'search donor', 'find donor', 'donation guide',
        'guide', 'events', 'profile', 'update profile', 'certificate', 'donor card',
        'login', 'forgot password', 'reset password', 'feedback',
        'আপনি কে', 'তুমি কে', 'কি করতে পারেন', 'যোগাযোগ', 'ইমেইল', 'ফোন',
        'নিবন্ধন', 'রেজিস্টার', 'ডোনার খুঁজ', 'গাইড', 'ইভেন্ট', 'প্রোফাইল',
        'সার্টিফিকেট', 'ডোনার কার্ড', 'লগইন', 'পাসওয়ার্ড', 'ফিডব্যাক'
    ];

    return directIntentKeywords.some((keyword) => q.includes(keyword));
}

function getGenericBloodDonationFallback(question, lang) {
    const q = normalizeQuestionForKB(question);
    const donationLike = ['blood', 'donation', 'donate', 'donor', 'rokto', 'রক্ত', 'ডোনার', 'দাতা'].some((word) => q.includes(word));
    if (!donationLike) return null;

    if (q.includes('tip') || q.includes('advice') || q.includes('prepare')) {
        return getKBAnswer(KNOWLEDGE_BASE.find((entry) => entry.keywords.includes('donation tips')), lang);
    }
    if (q.includes('after') || q.includes('post') || q.includes('pore') || q.includes('পরে')) {
        return getKBAnswer(KNOWLEDGE_BASE.find((entry) => entry.keywords.includes('after donat')), lang);
    }
    if (q.includes('before') || q.includes('age') || q.includes('আগে')) {
        return getKBAnswer(KNOWLEDGE_BASE.find((entry) => entry.keywords.includes('prepare')), lang);
    }
    if (q.includes('eligib') || q.includes('can i') || q.includes('পারব') || q.includes('যোগ্য')) {
        return getKBAnswer(KNOWLEDGE_BASE.find((entry) => entry.keywords.includes('who can donate')), lang);
    }

    if (lang === 'bangla') {
        return 'রক্তদান বিষয়ে আমি সাহায্য করতে পারি। আপনি চাইলে যোগ্যতা, প্রস্তুতি, দানের পরে কী করবেন, খাবার, রক্তের গ্রুপ, বা ডোনার খোঁজা নিয়ে নির্দিষ্টভাবে জিজ্ঞাসা করতে পারেন।';
    }
    if (lang === 'banglish') {
        return 'Blood donation niye ami help korte pari. Chaile eligibility, preparation, donation er por ki korben, food, blood group, ba donor search niye specific vabe jiggesh korte paren.';
    }
    return 'I can help with blood donation topics. You can ask specifically about eligibility, preparation, after-donation care, food, blood groups, or donor search.';
}

function buildKBContext(question) {
    const normalizedQuestion = normalizeQuestionForKB(question);
    const qWords = normalizedQuestion.split(/\s+/).filter(w => w.length > 0);
    const scored = KNOWLEDGE_BASE.map(entry => ({
        entry,
        ...scoreKBEntry(entry, qWords, normalizedQuestion)
    })).filter(s => s.score > 2).sort((a, b) => b.score - a.score);

    if (scored.length === 0) return '';

    const topEntries = scored.slice(0, 3);
    return '\n\n--- RELEVANT KNOWLEDGE BASE CONTEXT ---\n' +
        topEntries.map(s => `Q: ${s.entry.keywords.slice(0, 4).join(', ')}\nA: ${s.entry.answer}`).join('\n\n') +
        '\n--- END CONTEXT ---\n\nUse the above context to inform your answer if relevant. You may expand on it with your own knowledge.';
}

const CHAT_API_URL = '/chat';
const CHATBOT_STORAGE_PREFIX = 'bdc-chatbot';

let conversationHistory = [];
const MAX_HISTORY = 10;
let userMemory = { facts: [], preferences: {} };
let activeChatMemoryKey = '';

function getChatStorageKey() {
    const uid = state.currentUser?.uid || 'guest';
    return `${CHATBOT_STORAGE_PREFIX}:${uid}`;
}

function getUserFirstName() {
    const fullName = state.currentUserProfile?.fullName || state.currentUserProfile?.name || '';
    return fullName.trim().split(/\s+/).filter(Boolean)[0] || '';
}

function loadPersistedChatState() {
    const storageKey = getChatStorageKey();
    if (storageKey === activeChatMemoryKey) return;
    activeChatMemoryKey = storageKey;

    try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
            conversationHistory = [];
            userMemory = { facts: [], preferences: {} };
            return;
        }
        const parsed = JSON.parse(raw);
        conversationHistory = Array.isArray(parsed?.history) ? parsed.history.slice(-MAX_HISTORY) : [];
        userMemory = {
            facts: Array.isArray(parsed?.memory?.facts) ? parsed.memory.facts.slice(-12) : [],
            preferences: parsed?.memory?.preferences && typeof parsed.memory.preferences === 'object'
                ? parsed.memory.preferences
                : {}
        };
    } catch (_) {
        conversationHistory = [];
        userMemory = { facts: [], preferences: {} };
    }
}

function persistChatState() {
    try {
        localStorage.setItem(getChatStorageKey(), JSON.stringify({
            history: conversationHistory.slice(-MAX_HISTORY),
            memory: {
                facts: userMemory.facts.slice(-12),
                preferences: userMemory.preferences || {}
            }
        }));
    } catch (_) {}
}

function rememberUserFact(fact) {
    if (!fact) return;
    loadPersistedChatState();
    const cleanFact = fact.trim();
    if (!cleanFact) return;
    userMemory.facts = [cleanFact, ...userMemory.facts.filter((item) => item !== cleanFact)].slice(0, 12);
    persistChatState();
}

function rememberFromQuestion(question) {
    const q = question.trim();
    const lower = q.toLowerCase();

    const directNameMatch = q.match(/\b(?:my name is|i am|i'm|call me)\s+([a-z][a-z .'-]{1,40})/i);
    if (directNameMatch?.[1]) {
        const rawName = directNameMatch[1].trim().replace(/[.,!?]+$/, '');
        userMemory.preferences.name = rawName;
        rememberUserFact(`The user's preferred name is ${rawName}.`);
    }

    const locationMatch = q.match(/\b(?:i live in|i am from|from)\s+([a-z][a-z ,'-]{1,50})/i);
    if (locationMatch?.[1] && lower.includes('i')) {
        rememberUserFact(`The user said they are from ${locationMatch[1].trim().replace(/[.,!?]+$/, '')}.`);
    }

    const bloodGroupMatch = q.match(/\b(?:my blood group is|i am|i'm)\s*(a\+|a-|b\+|b-|ab\+|ab-|o\+|o-)\b/i);
    if (bloodGroupMatch?.[1]) {
        rememberUserFact(`The user's blood group is ${bloodGroupMatch[1].toUpperCase()}.`);
    }
}

function buildUserContext() {
    loadPersistedChatState();

    const profile = state.currentUserProfile || null;
    const privateName = getUserFirstName() || userMemory.preferences?.name || '';
    const lines = [];

    if (state.currentUser?.uid) {
        lines.push('This is a private 1:1 chat for the current logged-in user. Do not present it as public chat.');
    }
    if (privateName) {
        lines.push(`The user's first name is ${privateName}. You may address them by first name occasionally, but not in every reply.`);
    }
    if (profile?.bloodGroup) lines.push(`Profile blood group: ${profile.bloodGroup}.`);
    if (profile?.location) lines.push(`Profile location: ${profile.location}.`);
    if (profile?.department) lines.push(`Profile department: ${profile.department}.`);
    if (profile?.batch) lines.push(`Profile batch: ${profile.batch}.`);
    if (userMemory.facts.length) {
        lines.push(`Remembered user facts: ${userMemory.facts.slice(0, 8).join(' | ')}`);
    }

    return lines.length ? `\n\n--- USER CONTEXT ---\n${lines.join('\n')}\n--- END USER CONTEXT ---\n` : '';
}

function maybePersonalizeReply(reply) {
    const name = getUserFirstName() || userMemory.preferences?.name || '';
    if (!name || !reply || /<strong>\s*live agent\s*<\/strong>/i.test(reply)) return reply;
    if (new RegExp(`\\b${name}\\b`, 'i').test(reply)) return reply;
    return `<span style="font-weight:600;color:#111827">${escapeHtml(name)}</span>, ${reply}`;
}

function addToHistory(role, text) {
    loadPersistedChatState();
    conversationHistory.push({ role, parts: [{ text }] });
    if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_HISTORY);
    }
    persistChatState();
}

async function askGemini(question, ragContext = '') {
    const lang = detectLang(question);
    let langInstruction;
    if (lang === 'bangla') {
        langInstruction = `LANGUAGE: The user is communicating in Bengali/Bangla (বাংলা). You MUST reply ENTIRELY in Bengali script (বাংলা). Never use English sentences in your reply — only Bengali.`;
    } else if (lang === 'banglish') {
        langInstruction = `LANGUAGE: The user is communicating in Banglish (Bengali language written in English/Roman letters like "ami blood dite chai", "rokto deya jabe ki", "ami weak aktu").
You MUST reply in Banglish — meaning Bengali thoughts/words but written in English letters.
Example replies: "Haan, apni rokt dite parben jodi apnar boyosh 18+ hoy ar weight 50kg er beshi hoy", "Apnar hemoglobin level check kora dorkar, doctor er kache jan".
Do NOT use Bengali script. Do NOT reply in pure English. Reply in casual, natural Banglish.`;
    } else {
        langInstruction = `LANGUAGE: The user is communicating in English. Reply in clear, well-structured English.`;
    }

    try {
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: question,
                lang,
                context: ragContext,
                userContext: buildUserContext(),
                history: conversationHistory.slice(-MAX_HISTORY),
                langInstruction
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.warn('Chat API failed:', errData?.reply || errData?.error || response.statusText);
            return null;
        }

        const data = await response.json();
        const answer = data?.reply;
        if (answer) {
            addToHistory('user', question);
            addToHistory('model', answer);
            return answer;
        }
        return null;
    } catch (err) {
        console.warn('Chat API network error:', err.message);
        return null;
    }
}

async function askGeminiStream(question, ragContext = '', onChunk = () => {}) {
    const lang = detectLang(question);
    let langInstruction;
    if (lang === 'bangla') {
        langInstruction = `LANGUAGE: The user is communicating in Bengali/Bangla (বাংলা). You MUST reply ENTIRELY in Bengali script (বাংলা). Never use English sentences in your reply — only Bengali.`;
    } else if (lang === 'banglish') {
        langInstruction = `LANGUAGE: The user is communicating in Banglish (Bengali language written in English/Roman letters like "ami blood dite chai", "rokto deya jabe ki", "ami weak aktu").
You MUST reply in Banglish — meaning Bengali thoughts/words but written in English letters.
Example replies: "Haan, apni rokt dite parben jodi apnar boyosh 18+ hoy ar weight 50kg er beshi hoy", "Apnar hemoglobin level check kora dorkar, doctor er kache jan".
Do NOT use Bengali script. Do NOT reply in pure English. Reply in casual, natural Banglish.`;
    } else {
        langInstruction = `LANGUAGE: The user is communicating in English. Reply in clear, well-structured English.`;
    }

    try {
        const response = await fetch(CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: question,
                lang,
                context: ragContext,
                userContext: buildUserContext(),
                history: conversationHistory.slice(-MAX_HISTORY),
                langInstruction
            })
        });

        if (!response.ok || !response.body) {
            const errText = await response.text().catch(() => '');
            console.warn('Chat API failed:', errText || response.statusText);
            return null;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let answer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (!chunk) continue;
            answer += chunk;
            onChunk(answer, chunk);
        }

        answer += decoder.decode();

        if (answer.trim()) {
            addToHistory('user', question);
            addToHistory('model', answer);
            return answer;
        }
        return null;
    } catch (err) {
        console.warn('Chat API network error:', err.message);
        return null;
    }
}

function getLiveAgentFallback(lang) {
    if (lang === 'bangla') {
        return 'আপনার প্রশ্নের সাথে নির্দিষ্ট মিল পাইনি। 👨‍💬 <strong>Live agent</strong> এর সাহায্য নিতে পারেন: <a href="mailto:bauet.bdc@gmail.com">bauet.bdc@gmail.com</a> অথবা ফোন করুন <a href="tel:+8801712460423">+8801712460423</a>। জরুরি হলে নিকটস্থ হাসপাতালের সাথে যোগাযোগ করুন।';
    }
    if (lang === 'banglish') {
        return 'Apnar question er sathe specific match paini. 👨‍💬 <strong>Live agent</strong> er sathe jogajog korun: <a href="mailto:bauet.bdc@gmail.com">bauet.bdc@gmail.com</a> ba phone <a href="tel:+8801712460423">+8801712460423</a>। Emergency hole nearest hospital e jogajog korun.';
    }
    return 'I could not find a specific match. 👨‍💬 Please contact a <strong>Live agent</strong> at <a href="mailto:bauet.bdc@gmail.com">bauet.bdc@gmail.com</a> or call <a href="tel:+8801712460423">+8801712460423</a>. If it is urgent, contact your nearest hospital.';
}

function getClarifyFallback(lang) {
    if (lang === 'bangla') {
        return 'বিষয়টা একটু স্পষ্ট করলে আমি দ্রুত সাহায্য করতে পারি। 🙏 কী বিষয়ে জানতে চান—রক্তদান, ডোনার খোঁজা, নাকি অন্য কিছু? প্রয়োজনে ২–৩টা বিস্তারিত বলুন।';
    }
    if (lang === 'banglish') {
        return 'Ektu details dile ami bhalo help korte parbo. 🙏 Apni ki blood donation, donor search, naki onno kichu niye jiggesh korchen? 2–3 ta detail din.';
    }
    return 'Please share a bit more detail so I can help you quickly. 🙏 Is it about blood donation, donor search, or something else? A couple of details will help.';
}

function getAIFallbackMessage(lang) {
    if (lang === 'bangla') {
        return 'এই মুহূর্তে AI reply পাওয়া যাচ্ছে না, তাই স্বাভাবিকভাবে উত্তর জেনারেট করতে পারছি না। একটু পরে আবার চেষ্টা করুন, অথবা প্রশ্নটা একটু নির্দিষ্টভাবে লিখলে আমি available তথ্য দিয়ে সাহায্য করব।';
    }
    if (lang === 'banglish') {
        return 'Ekhon AI reply available na, tai ekdom natural vabe generate kore answer dite parchi na. Ektu pore abar try korun, ba question ta aro specific kore dile available info diye help korbo.';
    }
    return 'The AI reply service is unavailable right now, so I cannot generate a natural response at the moment. Please try again shortly, or send a more specific question and I will help with the information available.';
}

async function getAnswer(question, options = {}) {
    const { skipAI = false } = options;
    loadPersistedChatState();
    const lang = detectLang(question);
    const bloodGroup = extractBloodGroup(question);
    const wantsDonor = isDonorIntent(question);
    const softDonor = bloodGroup && ['donor', 'rokto', 'blood', 'lagbe', 'dorkar', 'chai', 'রক্ত', 'দাতা', 'ডোনার'].some(w => question.toLowerCase().includes(w));

    
    if (bloodGroup && (wantsDonor || softDonor)) {
        if (!state.donorsList || state.donorsList.length === 0) {
            const reply = getDonorListLoadingMessage(lang);
            addToHistory('user', question);
            addToHistory('model', stripHtml(reply));
            return reply;
        }
        const eligible = findEligibleDonors(bloodGroup);
        if (!eligible.length) {
            const fallback = findDonorsByGroup(bloodGroup);
            if (fallback.length) {
                const reply = wantsNameOnly(question)
                    ? formatDonorNameResults(fallback, bloodGroup, lang)
                    : formatFallbackDonorResults(fallback, bloodGroup, lang);
                addToHistory('user', question);
                addToHistory('model', stripHtml(reply));
                return reply;
            }
        }
        const reply = wantsNameOnly(question)
            ? formatDonorNameResults(eligible, bloodGroup, lang)
            : formatDonorResults(eligible, bloodGroup, lang);
        addToHistory('user', question);
        addToHistory('model', stripHtml(reply));
        return reply;
    }

    
    if (!skipAI) {
        const ragContext = buildKBContext(question) + buildDonorContext(question);
        const geminiAnswer = await askGemini(question, ragContext);
        if (geminiAnswer) {
            return geminiAnswer;
        }
    }

    const kbResult = searchKnowledgeBase(question);
    if (kbResult && (skipAI || shouldUseDirectKBFallback(question, kbResult))) {
        const reply = maybePersonalizeReply(kbResult.answer);
        addToHistory('user', question);
        addToHistory('model', stripHtml(reply));
        return reply;
    }

    const genericBloodDonationFallback = getGenericBloodDonationFallback(question, lang);
    if (genericBloodDonationFallback) {
        const reply = maybePersonalizeReply(genericBloodDonationFallback);
        addToHistory('user', question);
        addToHistory('model', stripHtml(reply));
        return reply;
    }

    const clarify = getClarifyFallback(lang);
    const aiFallback = getAIFallbackMessage(lang);
    const liveAgent = getLiveAgentFallback(lang);
    const reply = maybePersonalizeReply(`${aiFallback}<br><br>${clarify}<br><br>${liveAgent}`);
    addToHistory('user', question);
    addToHistory('model', stripHtml(reply));
    return reply;
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stripHtml(text) {
    const temp = document.createElement('div');
    temp.innerHTML = text;
    return temp.textContent || temp.innerText || '';
}

function formatPlainTextForHtml(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initChatbot() {
    loadPersistedChatState();
    
    const fab = document.createElement('div');
    fab.id = 'chatbot-fab';
    fab.innerHTML = `<button id="chatbot-toggle" aria-label="Blood Donation Assistant" title="Blood Donation Assistant" style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;cursor:pointer;box-shadow:0 6px 24px rgba(220,38,38,0.35);display:flex;align-items:center;justify-content:center;transition:all 0.3s;font-size:1.2rem;position:relative">
        <i class="fa-solid fa-robot"></i>
        <span style="position:absolute;top:-2px;right:-2px;width:10px;height:10px;background:#10b981;border-radius:50%;border:2px solid #fff"></span>
    </button>`;
    fab.style.cssText = 'position:fixed;bottom:80px;right:24px;z-index:45;transition:bottom 0.3s ease;';

    
    const chatWindow = document.createElement('div');
    chatWindow.id = 'chatbot-window';
    chatWindow.style.cssText = 'position:fixed;bottom:136px;right:24px;width:360px;max-width:calc(100vw - 32px);height:480px;max-height:calc(100vh - 180px);background:#fff;border-radius:1.25rem;box-shadow:0 20px 60px rgba(0,0,0,0.15),0 0 0 1px rgba(0,0,0,0.05);z-index:46;display:none;flex-direction:column;overflow:hidden;font-family:Inter,sans-serif;';
    chatWindow.innerHTML = `
        <div style="background:linear-gradient(135deg,#b91c1c,#dc2626,#ef4444);padding:1rem 1.25rem;display:flex;align-items:center;gap:0.75rem;flex-shrink:0">
            <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fa-solid fa-robot" style="color:#fff;font-size:1.05rem"></i>
            </div>
            <div style="flex:1;min-width:0">
                <div style="font-size:0.92rem;font-weight:700;color:#fff">Blood Donation Assistant</div>
                <div style="font-size:0.7rem;color:rgba(255,255,255,0.75);display:flex;align-items:center;gap:4px"><span style="width:6px;height:6px;background:#4ade80;border-radius:50%;display:inline-block"></span> Online</div>
            </div>
            <button id="chatbot-close" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                <i class="fa-solid fa-xmark" style="font-size:0.85rem"></i>
            </button>
        </div>
        <div id="chatbot-messages" style="flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.75rem;background:#f9fafb;scroll-behavior:smooth">
            <div style="display:flex;gap:0.5rem;align-items:flex-start">
                <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#ef4444);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">
                    <i class="fa-solid fa-robot" style="color:#fff;font-size:0.65rem"></i>
                </div>
                <div style="background:#fff;border-radius:0 0.85rem 0.85rem 0.85rem;padding:0.7rem 0.9rem;font-size:0.82rem;color:#374151;line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,0.06);max-width:85%">
                    Hello! 👋 I'm your <strong>Blood Donation Assistant</strong>. I can:<br>
                    🔍 <strong>Find donors</strong> — just tell me the blood group!<br>
                    💬 Answer questions about blood donation, eligibility & health.
                </div>
            </div>
        </div>
        <div style="padding:0.75rem;background:#fff;border-top:1px solid #f3f4f6;flex-shrink:0">
            <form id="chatbot-form" style="display:flex;gap:0.5rem;align-items:center">
                <input id="chatbot-input" type="text" placeholder="Ask about blood donation..." autocomplete="off" style="flex:1;padding:0.6rem 0.9rem;border:1.5px solid #e5e7eb;border-radius:0.75rem;font-size:0.82rem;outline:none;transition:border-color 0.2s;font-family:Inter,sans-serif;background:#f9fafb" onfocus="this.style.borderColor='#fca5a5';this.style.background='#fff'" onblur="this.style.borderColor='#e5e7eb';this.style.background='#f9fafb'" />
                <button type="submit" style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#ef4444);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                    <i class="fa-solid fa-paper-plane" style="font-size:0.8rem"></i>
                </button>
            </form>
            <div style="text-align:center;margin-top:0.4rem">
                <span style="font-size:0.62rem;color:#9ca3af">Powered by Gemini AI • Donor Finder + Website Guide</span>
            </div>
        </div>
    `;

    document.body.appendChild(fab);
    document.body.appendChild(chatWindow);

    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const chatForm = document.getElementById('chatbot-form');
    const chatInput = document.getElementById('chatbot-input');
    const messagesDiv = document.getElementById('chatbot-messages');

    let isOpen = false;
    function toggleChat() {
        isOpen = !isOpen;
        chatWindow.style.display = isOpen ? 'flex' : 'none';
        if (isOpen) {
            chatInput.focus();
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }
    toggleBtn?.addEventListener('click', toggleChat);
    closeBtn?.addEventListener('click', toggleChat);

    function addMessage(text, isUser) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `display:flex;gap:0.5rem;align-items:flex-start;${isUser ? 'flex-direction:row-reverse' : ''}`;
        if (isUser) {
            wrapper.innerHTML = `
                <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#818cf8);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">
                    <i class="fa-solid fa-user" style="color:#fff;font-size:0.65rem"></i>
                </div>
                <div style="background:linear-gradient(135deg,#6366f1,#818cf8);border-radius:0.85rem 0 0.85rem 0.85rem;padding:0.7rem 0.9rem;font-size:0.82rem;color:#fff;line-height:1.5;max-width:85%">${escapeHtml(text)}</div>
            `;
        } else {
            wrapper.innerHTML = `
                <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#dc2626,#ef4444);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">
                    <i class="fa-solid fa-robot" style="color:#fff;font-size:0.65rem"></i>
                </div>
                <div style="background:#fff;border-radius:0 0.85rem 0.85rem 0.85rem;padding:0.7rem 0.9rem;font-size:0.82rem;color:#374151;line-height:1.5;box-shadow:0 1px 3px rgba(0,0,0,0.06);max-width:85%">${text}</div>
            `;
        }
        messagesDiv.appendChild(wrapper);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return wrapper;
    }

    function createAssistantMessage(initialHtml = '') {
        const wrapper = addMessage(initialHtml, false);
        const bubble = wrapper.querySelector('div:last-child');
        return { wrapper, bubble };
    }

    function updateAssistantMessage(messageRef, html, isStreaming = false) {
        if (!messageRef?.bubble) return;
        messageRef.bubble.innerHTML = html;
        if (isStreaming) {
            messageRef.bubble.classList.add('chatbot-streaming');
        } else {
            messageRef.bubble.classList.remove('chatbot-streaming');
        }
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    async function typeAssistantMessage(messageRef, html, stepDelay = 14) {
        if (/<\/?[a-z][\s\S]*>/i.test(html)) {
            updateAssistantMessage(messageRef, html, false);
            return;
        }

        const temp = document.createElement('div');
        temp.innerHTML = html;
        const text = temp.textContent || temp.innerText || '';

        if (!text.trim()) {
            updateAssistantMessage(messageRef, html, false);
            return;
        }

        let typed = '';
        for (const char of text) {
            typed += char;
            updateAssistantMessage(messageRef, formatPlainTextForHtml(typed), true);
            await sleep(stepDelay);
        }

        updateAssistantMessage(messageRef, formatPlainTextForHtml(text), false);
    }

    function addTypingIndicator(isDonorSearch = false) {
        const wrapper = document.createElement('div');
        wrapper.id = 'chatbot-typing';
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;padding:0.15rem 0 0.25rem 0';
        const label = isDonorSearch ? 'Searching donors' : 'Thinking';
        wrapper.innerHTML = `
            <div class="chatbot-thinking-label" style="font-size:0.95rem;font-weight:600;color:#6b7280;letter-spacing:-0.01em;">
                ${label}<span class="chatbot-inline-dots"><span>.</span><span>.</span><span>.</span></span>
            </div>
            <div class="chatbot-thinking-subtle" style="margin-top:0.35rem;font-size:0.74rem;color:#9ca3af;line-height:1.45;">
                ${isDonorSearch ? 'Checking matching donor information for you.' : 'Preparing a natural reply for you.'}
            </div>
        `;
        messagesDiv.appendChild(wrapper);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function removeTypingIndicator() {
        document.getElementById('chatbot-typing')?.remove();
    }

    chatForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const question = chatInput.value.trim();
        if (!question) return;
        rememberFromQuestion(question);
        chatInput.value = '';
        addMessage(question, true);
        
        const bg = extractBloodGroup(question);
        const di = isDonorIntent(question);
        const softDonor = bg && ['donor', 'rokto', 'blood', 'lagbe', 'dorkar', 'chai', 'রক্ত', 'দাতা', 'ডোনার'].some(w => question.toLowerCase().includes(w));
        addTypingIndicator((bg && di) || softDonor);
        chatInput.disabled = true;

        const startTime = Date.now();
        try {
            const minimumThinkingTime = 1800;

            if (bg && (di || softDonor)) {
                const answer = await getAnswer(question);
                const elapsed = Date.now() - startTime;
                if (elapsed < minimumThinkingTime) {
                    await sleep(minimumThinkingTime - elapsed);
                }
                removeTypingIndicator();
                const assistantMessage = createAssistantMessage('');
                await typeAssistantMessage(assistantMessage, answer, 8);
            } else {
                const ragContext = buildKBContext(question) + buildDonorContext(question);
                let assistantMessage = null;
                let firstChunkReceived = false;

                const answer = await askGeminiStream(question, ragContext, (fullText) => {
                    if (!firstChunkReceived) {
                        const elapsed = Date.now() - startTime;
                        if (elapsed < minimumThinkingTime) {
                            return;
                        }
                        firstChunkReceived = true;
                        removeTypingIndicator();
                        assistantMessage = createAssistantMessage('');
                    }
                    if (!firstChunkReceived) return;
                    updateAssistantMessage(assistantMessage, formatPlainTextForHtml(fullText), true);
                });

                if (answer) {
                    const elapsed = Date.now() - startTime;
                    if (!firstChunkReceived && elapsed < minimumThinkingTime) {
                        await sleep(minimumThinkingTime - elapsed);
                    }
                    if (!assistantMessage) {
                        removeTypingIndicator();
                        assistantMessage = createAssistantMessage('');
                    }
                    updateAssistantMessage(assistantMessage, formatPlainTextForHtml(answer), false);
                } else {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < minimumThinkingTime) {
                        await sleep(minimumThinkingTime - elapsed);
                    }
                    removeTypingIndicator();
                    const fallback = await getAnswer(question, { skipAI: true });
                    const assistantMessage = createAssistantMessage('');
                    await typeAssistantMessage(assistantMessage, fallback, 10);
                }
            }
        } catch (err) {
            removeTypingIndicator();
            const lang = detectLang(question);
            const errMsg = lang === 'bangla' 
                ? 'দুঃখিত, কিছু সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন। 😔'
                : lang === 'banglish'
                ? 'Sorry, ektu problem hoyeche. Please abar try korun. 😔'
                : 'Sorry, something went wrong. Please try again. 😔';
            addMessage(errMsg, false);
        }
        chatInput.disabled = false;
        chatInput.focus();
    });

    
    const style = document.createElement('style');
    style.textContent = `
        .chatbot-dots span, .chatbot-inline-dots span { animation: chatbot-blink 1.4s infinite both; }
        .chatbot-dots span:nth-child(2), .chatbot-inline-dots span:nth-child(2) { animation-delay: 0.2s; }
        .chatbot-dots span:nth-child(3), .chatbot-inline-dots span:nth-child(3) { animation-delay: 0.4s; }
        .chatbot-inline-dots { display:inline-flex; margin-left:2px; min-width:18px; }
        .chatbot-inline-dots span { font-size: 1rem; line-height: 1; color:#9ca3af; }
        @keyframes chatbot-blink { 0%, 80%, 100% { opacity: 0.2; } 40% { opacity: 1; } }
        .chatbot-thinking-label, .chatbot-thinking-subtle { animation: think-fade-in 0.3s ease-out; }
        @keyframes think-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .chatbot-streaming::after { content: "▋"; display: inline-block; margin-left: 2px; color: #dc2626; animation: chatbot-cursor-blink 1s step-end infinite; }
        @keyframes chatbot-cursor-blink { 50% { opacity: 0; } }
        #chatbot-messages::-webkit-scrollbar { width: 4px; }
        #chatbot-messages::-webkit-scrollbar-track { background: transparent; }
        #chatbot-messages::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 4px; }
        @media (max-width: 640px) {
            #chatbot-window { width: calc(100vw - 16px) !important; right: 8px !important; bottom: 90px !important; height: calc(100vh - 140px) !important; max-height: calc(100vh - 140px) !important; border-radius: 1rem !important; }
            #chatbot-fab { right: 16px !important; bottom: 76px !important; }
            #chatbot-fab button { width: 52px !important; height: 52px !important; font-size: 1.2rem !important; }
        }
        @media (max-width: 400px) {
            #chatbot-window { height: calc(100vh - 130px) !important; max-height: calc(100vh - 130px) !important; }
            #chatbot-fab { right: 12px !important; bottom: 72px !important; }
            #chatbot-fab button { width: 48px !important; height: 48px !important; font-size: 1.1rem !important; }
        }
    `;
    document.head.appendChild(style);
}
