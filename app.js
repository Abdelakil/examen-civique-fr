let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let errors = 0;
let timerInterval = null;
let translations = {};
let currentLang = 'fr';

function t(key, replacements = {}) {
  let text = translations[key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

async function loadTranslations(lang) {
  try {
    const response = await fetch(`${lang}.json`);
    if (!response.ok) {
      console.error(`Could not load ${lang}.json. Status: ${response.status}`);
      throw new Error(`Could not load ${lang}.json`);
    }
    translations = await response.json();
  } catch (error) {
    console.error("Failed to load or parse translations:", error);
    if (lang !== 'fr') {
      await loadTranslations('fr');
    }
  }
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.getAttribute('data-i18n-key');
    const translation = t(key);
    if (translation !== key) {
      el.innerText = translation;
    } else {
      console.warn(`No translation found for key: ${key}`);
    }
  });
   document.querySelectorAll('[data-i18n-key-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-key-placeholder');
    const translation = t(key);
    if (translation !== key) {
        el.placeholder = translation;
    } else {
        console.warn(`No placeholder translation found for key: ${key}`);
    }
  });
}

async function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('language', lang); // Save preference
  document.documentElement.lang = lang;

  document.getElementById('lang-fr').classList.toggle('selected', lang === 'fr');
  document.getElementById('lang-en').classList.toggle('selected', lang === 'en');

  await loadTranslations(lang);
  applyTranslations();
  const currentTheme = localStorage.getItem('theme') || 'light';
  applyTheme(currentTheme);
}

function updateMenuVisibility() {
    const mode = document.getElementById('quiz-mode').value;
    const isThemeMode = mode === 'theme';
    const isMiseEnSituation = document.getElementById('mise-en-situation-choice').value === 'yes';

    document.getElementById('theme-selector-container').classList.toggle('hidden', !isThemeMode);
    document.getElementById('timed-exam-container').classList.toggle('hidden', isThemeMode);
    document.getElementById('mise-en-situation-container').classList.toggle('hidden', isThemeMode);
    document.getElementById('api-key-container').classList.toggle('hidden', isThemeMode || !isMiseEnSituation);
}

async function loadData(fileName) {
    try {
        const response = await fetch(`./${fileName}.JSON`);
        if (!response.ok) throw new Error(t('fileNotFound'));
        return await response.json();
    } catch (error) {
        alert(t('jsonLoadError'));
        return null;
    }
}

function pick(list, count, themeName) {
    if (!list) return [];
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(q => ({ ...q, themeLabel: themeName }));
}

async function generateMiseEnSituationQuestions(apiKey) {
    const prompt = t('geminiPrompt');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '');
        const questions = JSON.parse(cleanedText);

        return questions.map(q => ({
            question: q.question,
            choix: Array.isArray(q.choix) ? q.choix : [],
            reponse_correcte: q.reponse_correcte,
            themeLabel: "Mise en situation: " + q.theme,
            indice: q.indice
        }));
    } catch (error) {
        console.error(t('questionGenerationError'), error);
        alert(t('questionGenerationErrorAlert'));
        return [];
    }
}

async function initiateQuiz() {
    const cardType = document.getElementById('card-type').value;
    const data = await loadData(cardType);
    if (!data) return;

    const settings = getQuizSettings();
    currentQuestions = await buildQuestions(data, settings);

    if (currentQuestions.length === 0) {
        return;
    }

    score = 0;
    errors = 0;
    currentQuestionIndex = 0;
    
    if (timerInterval) clearInterval(timerInterval);

    if (settings.isTimed) {
        startTimer();
    } else {
        document.getElementById('timer-row').classList.add('hidden');
    }

    document.getElementById('menu').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
    showQuestion();
}

function getQuizSettings() {
    const cardType = document.getElementById('card-type').value;
    const mode = document.getElementById('quiz-mode').value;
    const isTimed = document.getElementById('timed-exam-choice').value === 'yes';
    const useMiseEnSituation = document.getElementById('mise-en-situation-choice').value === 'yes';
    const themeKey = document.getElementById('theme-choice').value;
    const count = parseInt(document.getElementById('question-count').value);
    const themeLabel = document.getElementById('theme-choice').options[document.getElementById('theme-choice').selectedIndex].text;

    return { cardType, mode, isTimed, useMiseEnSituation, themeKey, count, themeLabel };
}

async function buildQuestions(data, settings) {
    let questions = [];

    if (settings.mode === 'simulation') {
        const simulationConfig = [
            { key: 'devise_symboles', count: 3, theme: t('theme1') },
            { key: 'laicite', count: 2, theme: t('theme1') },
            { key: 'democratie_vote', count: 3, theme: t('theme2') },
            { key: 'organisation_republique', count: 2, theme: t('theme2') },
            { key: 'institutions_europeennes', count: 1, theme: t('theme2') },
            { key: 'droits_et_libertes_fondamentales', count: 2, theme: t('theme3') },
            { key: 'obligations_et_devoirs_du_citoyen', count: 3, theme: t('theme3') },
            { key: 'grandes_periodes_et_personnages_historiques', count: 3, theme: t('theme4') },
            { key: 'territoires_et_geographie', count: 3, theme: t('theme4') },
            { key: 'patrimoine_francais', count: 2, theme: t('theme4') },
            { key: 'sinstaller_et_resider_en_france', count: 1, theme: t('theme5') },
            { key: 'acces_aux_soins', count: 1, theme: t('theme5') },
            { key: 'travailler_en_france', count: 1, theme: t('theme5') },
            { key: 'autorite_parentale_et_systeme_educatif', count: 1, theme: t('theme5') }
        ];

        for (const config of simulationConfig) {
            const bloc = Object.values(data).find(b => b[config.key]);
            if (bloc) {
                questions.push(...pick(bloc[config.key], config.count, config.theme));
            }
        }

        if (settings.useMiseEnSituation) {
            const apiKey = document.getElementById('api-key').value;
            if (!apiKey) {
                alert(t('geminiApiKeyError'));
                return [];
            }
            localStorage.setItem('apiKey', apiKey);
            
            document.getElementById('menu').classList.add('hidden');
            document.getElementById('loader').classList.remove('hidden');

            const aiQuestions = await generateMiseEnSituationQuestions(apiKey);

            document.getElementById('loader').classList.add('hidden');

            if (aiQuestions.length === 0) {
                document.getElementById('menu').classList.remove('hidden');
                return [];
            }
            questions.push(...aiQuestions);
        }
    } else {
        let allThemeQuestions = [];
        for (let sub in data[settings.themeKey]) {
            allThemeQuestions.push(...data[settings.themeKey][sub]);
        }
        questions = pick(allThemeQuestions, settings.count, settings.themeLabel);
    }

    return questions;
}

function startTimer() {
    document.getElementById('timer-row').classList.remove('hidden');
    let timeLeft = 45 * 60;
    const timerDisplay = document.getElementById('stat-timer');

    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        timerDisplay.textContent = `${minutes}:${seconds}`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timerInterval);
            alert(t('timeUp'));
            showFinalResults();
        }
    }, 1000);
}

function updateStats() {
    const currentQ = currentQuestions[currentQuestionIndex];
    if (!currentQ) return;
    const currentTheme = currentQ.themeLabel;
    
    const remainingInTheme = currentQuestions.slice(currentQuestionIndex).filter(q => q.themeLabel === currentTheme).length;

    document.getElementById('stat-theme').innerText = currentTheme;
    document.getElementById('stat-theme-progress').innerText = remainingInTheme;
    document.getElementById('stat-total-left').innerText = currentQuestions.length - currentQuestionIndex;
    document.getElementById('stat-correct-count').innerText = score;
    document.getElementById('stat-wrong-count').innerText = errors;
}

function showQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    if (!q) return;

    updateStats();
    
    document.getElementById('hint-container').classList.add('hidden');
    
    document.getElementById('question-text').innerText = q.question;
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    document.getElementById('prev-btn').disabled = (currentQuestionIndex === 0);
    document.getElementById('next-btn').innerText = (currentQuestionIndex === currentQuestions.length - 1) ? t('finishButton') : t('nextButton');

    q.choix.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'btn-choix';
        btn.innerText = choice;

        if (q.userAnswer) {
            if (choice === q.reponse_correcte) btn.classList.add('correct');
            if (choice === q.userAnswer && q.userAnswer !== q.reponse_correcte) btn.classList.add('wrong');
            btn.disabled = true;
        }

        btn.onclick = () => validateAnswer(choice, q.reponse_correcte, btn);
        container.appendChild(btn);
    });
}

function validateAnswer(selected, correct, btn) {
    const q = currentQuestions[currentQuestionIndex];
    
    if (q.userAnswer) return; 

    q.userAnswer = selected; 

    const allButtons = document.querySelectorAll('.btn-choix');

    allButtons.forEach(b => {
        b.disabled = true;
        
        if (b.innerText === correct) {
            b.classList.add('correct');
        }
    });

    if (selected !== correct) {
        btn.classList.add('wrong');
        errors++;
    } else {
        score++;
    }
    
    updateStats(); 
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    } else {
        showFinalResults();
    }
}

function showFinalResults() {
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('score-display').innerText = t('scoreDisplay', { score: score, total: currentQuestions.length });
}

function toggleHint() {
    const container = document.getElementById('hint-container');
    const q = currentQuestions[currentQuestionIndex];
    
    if (container.classList.contains('hidden')) {
        document.getElementById('hint-text').innerText = q.indice || t('noHint');
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const savedLang = localStorage.getItem('language');
    const userLang = savedLang || new URLSearchParams(window.location.search).get('lang') || navigator.language.split('-')[0] || 'fr';
    await setLanguage(userLang.startsWith('en') ? 'en' : 'fr');
    
    initializeTheme();
    document.getElementById('quiz-mode').addEventListener('change', updateMenuVisibility);
    document.getElementById('mise-en-situation-choice').addEventListener('change', updateMenuVisibility);

    document.getElementById('lang-fr').addEventListener('click', () => setLanguage('fr'));
    document.getElementById('lang-en').addEventListener('click', () => setLanguage('en'));

    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey) {
        document.getElementById('api-key').value = savedApiKey;
    }

    updateMenuVisibility();
});

function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    
    // Apply theme from local storage or default
    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    // Listener for the toggle switch
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

function applyTheme(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.checked = false;
    }
}
