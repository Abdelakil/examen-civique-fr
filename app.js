let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let errors = 0;
let timerInterval = null;

function updateMenuVisibility() {
    const mode = document.getElementById('quiz-mode').value;
    const isThemeMode = mode === 'theme';
    const isMiseEnSituation = document.getElementById('mise-en-situation-choice').value === 'yes';

    document.getElementById('theme-selector-container').style.display = isThemeMode ? 'block' : 'none';
    document.getElementById('timed-exam-container').style.display = isThemeMode ? 'none' : 'block';
    document.getElementById('mise-en-situation-container').style.display = isThemeMode ? 'none' : 'block';
    document.getElementById('api-key-container').style.display = !isThemeMode && isMiseEnSituation ? 'block' : 'none';
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

    const mode = document.getElementById('quiz-mode').value;
    const isTimed = document.getElementById('timed-exam-choice').value === 'yes';
    const useMiseEnSituation = document.getElementById('mise-en-situation-choice').value === 'yes';

    currentQuestions = [];
    score = 0;
    errors = 0;
    currentQuestionIndex = 0;
    
    if (timerInterval) clearInterval(timerInterval);

    if (mode === 'simulation') {
        // Bloc 1
        currentQuestions.push(...pick(data.bloc1_principes_valeurs.devise_symboles, 3, "Principes & Valeurs"));
        currentQuestions.push(...pick(data.bloc1_principes_valeurs.laicite, 2, "Principes & Valeurs"));
        // Bloc 2
        currentQuestions.push(...pick(data.bloc2_institutionnel_politique.democratie_vote, 3, "Institutions"));
        currentQuestions.push(...pick(data.bloc2_institutionnel_politique.organisation_republique, 2, "Institutions"));
        currentQuestions.push(...pick(data.bloc2_institutionnel_politique.institutions_europeennes, 1, "Institutions"));
        // Bloc 3
        currentQuestions.push(...pick(data.bloc3_droits_et_devoirs.droits_et_libertes_fondamentales, 2, "Droits & Devoirs"));
        currentQuestions.push(...pick(data.bloc3_droits_et_devoirs.obligations_et_devoirs_du_citoyen, 3, "Droits & Devoirs"));
        // Bloc 4
        currentQuestions.push(...pick(data.bloc4_histoire_geo_culture.grandes_periodes_et_personnages_historiques, 3, "Histoire & Géo"));
        currentQuestions.push(...pick(data.bloc4_histoire_geo_culture.territoires_et_geographie, 3, "Histoire & Géo"));
        currentQuestions.push(...pick(data.bloc4_histoire_geo_culture.patrimoine_francais, 2, "Histoire & Géo"));
        // Bloc 5
        currentQuestions.push(...pick(data.bloc5_vivre_en_societe.sinstaller_et_resider_en_france, 1, "Vivre en France"));
        currentQuestions.push(...pick(data.bloc5_vivre_en_societe.acces_aux_soins, 1, "Vivre en France"));
        currentQuestions.push(...pick(data.bloc5_vivre_en_societe.travailler_en_france, 1, "Vivre en France"));
        currentQuestions.push(...pick(data.bloc5_vivre_en_societe.autorite_parentale_et_systeme_educatif, 1, "Vivre en France"));

        if (useMiseEnSituation) {
            const apiKey = document.getElementById('api-key').value;
            if (!apiKey) {
                alert("Veuillez entrer votre clé API Gemini pour générer les questions 'Mise en situation'.");
                return;
            }
            
            // Show loading indicator
            document.getElementById('menu').innerHTML = '<h2>Génération des questions en cours...</h2>';

            const aiQuestions = await generateMiseEnSituationQuestions(apiKey);
            if (aiQuestions.length === 0) {
                // Reload if AI questions fail
                location.reload(); 
                return;
            }
            currentQuestions.push(...aiQuestions);
        }

        if (isTimed) {
            document.getElementById('timer-row').style.display = ''; // Show timer row
            let timeLeft = 45 * 60; // 45 minutes in seconds
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
        } else {
            document.getElementById('timer-row').style.display = 'none'; // Hide timer row
        }

    } else {
        const themeKey = document.getElementById('theme-choice').value;
        const count = parseInt(document.getElementById('question-count').value);
        const themeLabel = document.getElementById('theme-choice').options[document.getElementById('theme-choice').selectedIndex].text;
        
        let allThemeQuestions = [];
        for (let sub in data[themeKey]) {
            allThemeQuestions.push(...data[themeKey][sub]);
        }
        currentQuestions = pick(allThemeQuestions, count, themeLabel);
        document.getElementById('timer-row').style.display = 'none'; // Hide timer row
    }

    document.getElementById('menu').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    showQuestion();
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
    document.getElementById('hint-container').style.display = 'none';
    
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
    document.getElementById('quiz-container').style.display = 'none';
    document.getElementById('results').style.display = 'block';
    document.getElementById('score-display').innerText = `Score Final : ${score} / ${currentQuestions.length}`;
}

// Fonction pour afficher/masquer l'indice
function toggleHint() {
    const container = document.getElementById('hint-container');
    const q = currentQuestions[currentQuestionIndex];
    
    if (container.style.display === 'none') {
        document.getElementById('hint-text').innerText = q.indice || "Pas d'indice disponible pour cette question.";
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

// Dark Mode Toggle
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('quiz-mode').addEventListener('change', updateMenuVisibility);
    document.getElementById('mise-en-situation-choice').addEventListener('change', updateMenuVisibility);

    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    updateMenuVisibility(); // Set initial state of selectors
    applyTheme(currentTheme);

    themeToggle.addEventListener('click', () => {
        let newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.textContent = '🌙';
        }
    }
});
