let currentQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let errors = 0;

function toggleThemeSelector() {
    const mode = document.getElementById('quiz-mode').value;
    document.getElementById('theme-selector-container').style.display = (mode === 'theme') ? 'block' : 'none';
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
    currentQuestions = [];
    score = 0;
    errors = 0;
    currentQuestionIndex = 0;

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
    } else {
        const themeKey = document.getElementById('theme-choice').value;
        const count = parseInt(document.getElementById('question-count').value);
        const themeLabel = document.getElementById('theme-choice').options[document.getElementById('theme-choice').selectedIndex].text;
        
        let allThemeQuestions = [];
        for (let sub in data[themeKey]) {
            allThemeQuestions.push(...data[themeKey][sub]);
        }
        currentQuestions = pick(allThemeQuestions, count, themeLabel);
    }

    document.getElementById('menu').style.display = 'none';
    document.getElementById('quiz-container').style.display = 'block';
    showQuestion();
}

function updateStats() {
    const currentQ = currentQuestions[currentQuestionIndex];
    const currentTheme = currentQ.themeLabel;
    
    const remainingInTheme = currentQuestions.slice(currentQuestionIndex).filter(q => q.themeLabel === currentTheme).length;

    document.getElementById('stat-theme').innerText = currentTheme;
    document.getElementById('stat-theme-progress').innerText = remainingInTheme;
    document.getElementById('stat-total-left').innerText = currentQuestions.length - currentQuestionIndex;
    document.getElementById('stat-correct-count').innerText = score;
    document.getElementById('stat-wrong-count').innerText = errors;
}

function showQuestion() {
    updateStats();
    const q = currentQuestions[currentQuestionIndex];
    document.getElementById('question-text').innerText = q.question;
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    q.choix.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'btn-choix';
        btn.innerText = choice;
        btn.onclick = () => validateAnswer(choice, q.reponse_correcte, btn);
        container.appendChild(btn);
    });
    document.getElementById('next-btn').style.display = 'none';
}

function validateAnswer(selected, correct, btn) {
    const buttons = document.querySelectorAll('.btn-choix');
    buttons.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add('correct');
        score++;
    } else {
        btn.classList.add('wrong');
        errors++;
        buttons.forEach(b => { if (b.innerText === correct) b.classList.add('correct'); });
    }
    
    document.getElementById('stat-correct-count').innerText = score;
    document.getElementById('stat-wrong-count').innerText = errors;
    document.getElementById('next-btn').style.display = 'block';
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        showQuestion();
    } else {
        document.getElementById('quiz-container').style.display = 'none';
        document.getElementById('results').style.display = 'block';
        document.getElementById('score-display').innerText = `Score Final : ${score} / ${currentQuestions.length}`;
    }
}