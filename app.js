let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let errors = 0;
let timerInterval = null;

function toggleThemeSelector() {
    const mode = document.getElementById('quiz-mode').value;
    const isThemeMode = mode === 'theme';
    
    document.getElementById('theme-selector-container').style.display = isThemeMode ? 'block' : 'none';
    document.getElementById('timed-exam-container').style.display = isThemeMode ? 'none' : 'block';
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

async function initiateQuiz() {
    const cardType = document.getElementById('card-type').value;
    const data = await loadData(cardType);
    if (!data) return;

    const mode = document.getElementById('quiz-mode').value;
    const isTimed = document.getElementById('timed-exam-choice').value === 'yes';

    currentQuestions = [];
    score = 0;
    errors = 0;
    currentQuestionIndex = 0;
    
    if (timerInterval) clearInterval(timerInterval); // Clear any existing timer

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
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    toggleThemeSelector(); // Set initial state of selectors
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
