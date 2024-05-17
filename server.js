import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import dayjs from 'dayjs';
import dotenv from 'dotenv';

// pour variable d'environnement
dotenv.config(); 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// La liste des étudiants fournit 
let students = [
    
];

// Charger les données des étudiants depuis le fichier JSON au démarrage du serveur
const loadStudentsData = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'src', 'data', 'students.json'));
        students = JSON.parse(data);
    } catch (error) {
        console.error('Error loading students data:', error);
    }
};

// Ici permet d'enregistrer les données des étudiants dans le fichier JSON
const saveStudentsData = () => {
    fs.writeFile(path.join(__dirname, 'src', 'Data', 'students.json'), JSON.stringify(students), (err) => {
        if (err) {
            console.error('Error saving students data:', err);
        } else {
            console.log('Students data saved successfully.');
        }
    });
};

// Aller on charge les données des étudiants au démarrage du serveur
loadStudentsData();


// On oublie pas de formater les dates en français (pour date d'anniv)
students.forEach(student => {
    student.birth = dayjs(student.birth).locale('fr').format('DD/MM/YYYY');
});


// Création du serveur HTTP
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true); // Parsing de l'URL de la requête
    const pathname = parsedUrl.pathname; // Chemin de la requête

    // Ici route pour la page principale (donc le formulaire)
    if (pathname === '/' && req.method === 'GET') {
        serveStaticFile(res, 'src/view/home.html', 'text/html');
    } 
    // là = route pour la page des etudiants
    else if (pathname === '/users' && req.method === 'GET') {
    fs.readFile(path.join(__dirname, 'src', 'Data', 'students.json'), (err, data) => {
        if (err) {
            console.error('Error loading students data:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
            return;
        }
    // Analyse les données JSON des étudiants
    const studentsData = JSON.parse(data);

    // Génère le contenu HTML de la page users
    let usersPageContent = `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="/assets/css/style.css">
            <title>Liste des étudiants</title>
        </head>
        <body>
            <nav>
                <a href="/">Formulaire</a>
                <a href="/users">Etudiants</a>
            </nav>
            <h1>Liste des étudiants</h1>
            <ul>`;

    // Ajoute chaque étudiant à la liste+
    studentsData.forEach(student => {
        usersPageContent += `<li><strong>${student.name}</strong> : 🎂 ${student.birth} <button class="delete" data-name="${student.name}">🗑️ Supprimer</button></li>`;
    });

    // Ferme la balise UL et le reste du HTML
    usersPageContent += `
            </ul>
            <script>
                document.querySelectorAll('.delete').forEach(button => {
                    button.addEventListener('click', () => {
                        const name = button.dataset.name;
                        fetch(\`/deleteUser?name=\${name}\`, { method: 'DELETE' }).then(() => {
                            window.location.reload();
                        });
                    });
                });
            </script>
        </body>
        </html>`;

    // Envoyer la réponse avec le contenu HTML généré
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(usersPageContent);
    });
    } 

    // CSS
    else if (pathname === '/assets/css/style.css' && req.method === 'GET') {
        serveStaticFile(res, 'src/assets/css/style.css', 'text/css');
    } 


    // AJOUTER un etudiant
// AJOUTER un utilisateur
else if (pathname === '/addUser' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
        body += chunk.toString(); // Accumulation des données reçues
    });
    req.on('end', () => {
        const { name, birth } = parseFormData(body); // Parsing des données de formulaire
        // Lire le fichier JSON pour obtenir la liste actuelle des étudiants
        fs.readFile(path.join(__dirname, 'src', 'Data', 'students.json'), (err, data) => {
            if (err) {
                console.error('Error loading students data:', err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                return;
            }

            let studentsData = JSON.parse(data);
            studentsData.push({ name, birth: dayjs(birth).locale('fr').format('DD/MM/YYYY') }); // Ajout du nouvel utilisateur
            fs.writeFile(path.join(__dirname, 'src', 'Data', 'students.json'), JSON.stringify(studentsData, null, 2), err => {
                if (err) {
                    console.error('Error writing students data:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                    return;
                }

                res.writeHead(302, { 'Location': '/users' }); // Redirection vers la page des utilisateurs
                res.end();
            });
        });
    });
}



    // SUPPRIMER un utilisateur
else if (pathname === '/deleteUser' && req.method === 'DELETE') {
    const { name } = parsedUrl.query;
    fs.readFile(path.join(__dirname, 'src', 'Data', 'students.json'), (err, data) => {
        if (err) {
            console.error('Error loading students data:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
            return;
        }

        let studentsData = JSON.parse(data);
        const index = studentsData.findIndex(student => student.name === name);
        if (index !== -1) {
            studentsData.splice(index, 1); // Suppression de l'utilisateur
            fs.writeFile(path.join(__dirname, 'src', 'Data', 'students.json'), JSON.stringify(studentsData, null, 2), err => {
                if (err) {
                    console.error('Error writing students data:', err);
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('500 Internal Server Error');
                    return;
                }

                res.writeHead(204); // No Content
                res.end();
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
        }
    });
}

});

// pour les fichiers statiques
const serveStaticFile = (res, filePath, contentType) => {
    const fullPath = path.join(__dirname, filePath);
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('500 Internal Server Error');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
};

// FORMULAIRE 
// Fonction pour parser les données de formulaire
const parseFormData = (body) => {
    console.log('Data received from form:', body);
    const params = new URLSearchParams(body);
    const name = params.get('name');
    const birth = params.get('birth');
    console.log('Parsed name:', name); 
    console.log('Parsed birth:', birth);
    return { name, birth };
};




// Configuration du serveur (définis dans .env)
const PORT = process.env.APP_PORT || 3000;
const HOST = process.env.APP_HOST || 'localhost';

server.listen(PORT, HOST, () => {
    console.log(`Server is running at http://${HOST}:${PORT}`);
});