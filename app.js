let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let errors = 0;
let timerInterval = null;

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
        if (!response.ok) throw new Error("Fichier non trouvé");
        return await response.json();
    } catch (error) {
        alert("Erreur de chargement du fichier JSON. Vérifiez qu'il s'appelle bien CSP.JSON ou CR.JSON");
        return null;
    }
}

function pick(list, count, themeName) {
    if (!list) return [];
    const shuffled = [...list].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count).map(q => ({ ...q, themeLabel: themeName }));
}

async function generateMiseEnSituationQuestions(apiKey) {
const prompt = `Générez 12 questions de type "mise en situation" pour un examen de citoyenneté française.
- 6 questions pour le thème "Principes et valeurs de la République".
- 6 questions pour le thème "Droits et devoirs".
 Il faut éviter les questions théoriques ou abstraites, les formulations générales qui parlent directement d’un principe (égalité, laïcité, liberté, etc.) sans situation précise, les phrases longues ou complexes, le vocabulaire difficile (au-delà du niveau A2), les questions avec plus d’une phrase ou plus de deux parties, les mises en situation sans conflit, ainsi que les questions vagues du type « quelle est la meilleure action » ou « quelle attitude est la plus appropriée ».-Je souhaite que les questions utilisent un vocabulaire simple, de niveau maximum A2, avec des phrases courtes et faciles à comprendre. Chaque question doit décrire un conflit clair, soit entre deux personnes (Monsieur X et Monsieur Y, ou Madame X et Madame Y), soit entre une personne et une administration, et demander directement ce que la personne peut faire, doit faire, ou si une action est autorisée. Les personnes doivent toujours être anonymisées en utilisant X et Y. Il faut également éviter les questions de type « vrai/faux » ou de définition légale, comme : « Est-ce que payer les impôts est un droit ou un devoir ? », « Est-ce que la loi demande d’aider une personne en danger ? », « Est-ce un devoir civique ? » ou « Est-ce que la loi oblige l’enfant à recevoir une instruction ? ». Les questions ne doivent pas demander de réciter la loi ni de qualifier un droit ou un devoir de manière abstraite, mais toujours s’appuyer sur une situation concrète, avec un conflit réel entre des personnes X et Y ou entre une personne et une administration, et demander ce que la personne peut ou doit faire dans ce contexte précis.
Le format de sortie doit être un JSON contenant une liste d'objets. Chaque objet doit avoir les clés suivantes :
- "theme": une chaîne de caractères ("Principes & Valeurs" ou "Droits & Devoirs").
- "question": une chaîne de caractères contenant la question.
- "choix": un tableau de 4 chaînes de caractères pour les options de réponse.
- "reponse_correcte": une chaîne de caractères qui correspond exactement à l'une des chaînes du tableau "choix".
- "indice": une chaîne de caractères fournissant un indice pour la question.

Assurez-vous que la sortie est un JSON valide et rien d'autre.`;

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
        // Clean the text to remove the ```json and ``` at the beginning and end
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '');
        const questions = JSON.parse(cleanedText);

        return questions.map(q => ({
            question: q.question,
            choix: Array.isArray(q.choix) ? q.choix : [],
            reponse_correcte: q.reponse_correcte,
            themeLabel: q.theme,
        }));
    } catch (error) {
        console.error("Erreur lors de la génération des questions :", error);
        alert("Impossible de générer les questions. Vérifiez votre clé API et votre connexion Internet.");
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
            { key: 'devise_symboles', count: 3, theme: "Principes & Valeurs" },
            { key: 'laicite', count: 2, theme: "Principes & Valeurs" },
            { key: 'democratie_vote', count: 3, theme: "Institutions" },
            { key: 'organisation_republique', count: 2, theme: "Institutions" },
            { key: 'institutions_europeennes', count: 1, theme: "Institutions" },
            { key: 'droits_et_libertes_fondamentales', count: 2, theme: "Droits & Devoirs" },
            { key: 'obligations_et_devoirs_du_citoyen', count: 3, theme: "Droits & Devoirs" },
            { key: 'grandes_periodes_et_personnages_historiques', count: 3, theme: "Histoire & Géo" },
            { key: 'territoires_et_geographie', count: 3, theme: "Histoire & Géo" },
            { key: 'patrimoine_francais', count: 2, theme: "Histoire & Géo" },
            { key: 'sinstaller_et_resider_en_france', count: 1, theme: "Vivre en France" },
            { key: 'acces_aux_soins', count: 1, theme: "Vivre en France" },
            { key: 'travailler_en_france', count: 1, theme: "Vivre en France" },
            { key: 'autorite_parentale_et_systeme_educatif', count: 1, theme: "Vivre en France" }
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
                alert("Veuillez entrer votre clé API Gemini pour générer les questions 'Mise en situation'.");
                return [];
            }
            localStorage.setItem('apiKey', apiKey); // Save API key
            
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
            alert("Temps écoulé !");
            showFinalResults();
        }
    }, 1000);
}

function updateStats() {
    const currentQ = currentQuestions[currentQuestionIndex];
    if (!currentQ) return; // Exit if no current question
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
    if (!q) return; // Exit if the question doesn't exist

    updateStats();
    
    // Cacher l'indice de la question précédente
    document.getElementById('hint-container').classList.add('hidden');
    
    document.getElementById('question-text').innerText = q.question;
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    // Gestion des boutons navigation
    document.getElementById('prev-btn').disabled = (currentQuestionIndex === 0);
    document.getElementById('next-btn').innerText = (currentQuestionIndex === currentQuestions.length - 1) ? "Terminer" : "Suivant";

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
    
    // 1. Si l'utilisateur a déjà répondu, on ne fait rien
    if (q.userAnswer) return; 

    // 2. On enregistre la réponse
    q.userAnswer = selected; 

    // 3. On récupère TOUS les boutons de réponse
    const allButtons = document.querySelectorAll('.btn-choix');

    // 4. On boucle sur tous les boutons pour les griser/désactiver
    allButtons.forEach(b => {
        b.disabled = true; // C'est ici que le "grisé" se produit
        
        // On affiche la bonne réponse en vert pour l'utilisateur
        if (b.innerText === correct) {
            b.classList.add('correct');
        }
    });

    // 5. Si l'utilisateur a eu faux, on marque son bouton en rouge
    if (selected !== correct) {
        btn.classList.add('wrong');
        errors++;
    } else {
        score++;
    }
    
    // 6. Mise à jour immédiate du tableau de bord à droite
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
        // Si c'est la dernière question, on affiche les résultats
        showFinalResults();
    }
}

function showFinalResults() {
    if (timerInterval) clearInterval(timerInterval); // Stop timer when quiz ends
    document.getElementById('quiz-container').classList.add('hidden');
    document.getElementById('results').classList.remove('hidden');
    document.getElementById('score-display').innerText = `Score Final : ${score} / ${currentQuestions.length}`;
}

// Fonction pour afficher/masquer l'indice
function toggleHint() {
    const container = document.getElementById('hint-container');
    const q = currentQuestions[currentQuestionIndex];
    
    if (container.classList.contains('hidden')) {
        document.getElementById('hint-text').innerText = q.indice || "Pas d'indice disponible pour cette question.";
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }
}

// Dark Mode Toggle
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    document.getElementById('quiz-mode').addEventListener('change', updateMenuVisibility);
    document.getElementById('mise-en-situation-choice').addEventListener('change', updateMenuVisibility);

    const savedApiKey = localStorage.getItem('apiKey');
    if (savedApiKey) {
        document.getElementById('api-key').value = savedApiKey;
    }

    updateMenuVisibility(); // Set initial state of selectors
});

function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    applyTheme(currentTheme);

    themeToggle.addEventListener('click', () => {
        let newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
}

function applyTheme(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = '🌙';
    }
}
