const db = firebase.database();
const auth = firebase.auth();

function addService() {
    const vehicleName = document.getElementById('vehicle-name').value;
    const service = document.getElementById('service').value;
    const passengers = document.getElementById('passengers').value;
    const availableSeats = document.getElementById('available-seats').value;

    if (vehicleName && service && passengers && availableSeats) {
        db.ref('vehicles/' + vehicleName).set({
            service,
            passengers,
            availableSeats,
            lastUpdated: new Date().toLocaleString()
        }).catch(error => {
            console.error("Error writing to database:", error);
        });
    }
}

function updateSeats(vehicleName, seats) {
    db.ref('vehicles/' + vehicleName).update({
        availableSeats: seats,
        lastUpdated: new Date().toLocaleString()
    }).catch(error => {
        console.error("Error updating seats:", error);
    });
    logChange(`Los lugares disponibles del vehículo ${vehicleName} se han actualizado a ${seats}.`);
}

function deleteVehicle(vehicleName) {
    db.ref('vehicles/' + vehicleName).remove().catch(error => {
        console.error("Error deleting vehicle:", error);
    });
    logChange(`El vehículo ${vehicleName} ha sido eliminado.`);
}

function incrementSeats(vehicleName) {
    db.ref('vehicles/' + vehicleName).once('value').then(snapshot => {
        const vehicle = snapshot.val();
        const newSeats = parseInt(vehicle.availableSeats) + 1;
        updateSeats(vehicleName, newSeats);
    });
}

function decrementSeats(vehicleName) {
    db.ref('vehicles/' + vehicleName).once('value').then(snapshot => {
        const vehicle = snapshot.val();
        const newSeats = parseInt(vehicle.availableSeats) - 1;
        if (newSeats >= 0) {
            updateSeats(vehicleName, newSeats);
        }
    });
}

db.ref('vehicles').on('value', (snapshot) => {
    const vehicleTableBody = document.querySelector('#vehicle-table tbody');
    vehicleTableBody.innerHTML = '';

    const vehicles = snapshot.val();
    for (const vehicleName in vehicles) {
        const vehicle = vehicles[vehicleName];
        const row = document.createElement('tr');
        row.classList.add('vehicle');
        row.innerHTML = `
            <td>${vehicleName}</td>
            <td>${vehicle.passengers}</td>
            <td>${vehicle.service}</td>
            <td>
                <div class="editable-container">
                    <button class="btn btn-secondary btn-sm" onclick="decrementSeats('${vehicleName}')">-</button>
                    <div class="editable">${vehicle.availableSeats}</div>
                    <button class="btn btn-secondary btn-sm" onclick="incrementSeats('${vehicleName}')">+</button>
                </div>
            </td>
            <td><button class="btn btn-danger btn-sm" onclick="deleteVehicle('${vehicleName}')">X</button></td>
        `;
        vehicleTableBody.appendChild(row);
    }
});

// Chat functionality
function sendMessage() {
    const message = document.getElementById('chat-input').value;
    if (message) {
        db.ref('chat').push({
            message,
            timestamp: Date.now(),
            user: auth.currentUser.email
        });
        document.getElementById('chat-input').value = '';
        playSound();
    }
}

db.ref('chat').on('child_added', (snapshot) => {
    const messageData = snapshot.val();
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    if (messageData.user === auth.currentUser.email) {
        messageDiv.classList.add('user');
    }
    messageDiv.innerHTML = `
        <div class="message-content">${messageData.message}</div>
        <div class="message-timestamp">${new Date(messageData.timestamp).toLocaleTimeString()}</div>
    `;
    document.getElementById('chat-messages').appendChild(messageDiv);
    document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;
});

function clearChat() {
    db.ref('chat').remove();
    document.getElementById('chat-messages').innerHTML = '';
}

function handleKeyDown(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Authentication functionality
function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            document.getElementById('login-form').classList.add('d-none');
            document.getElementById('main-content').classList.remove('d-none');

            const currentUser = auth.currentUser;
            if (currentUser && currentUser.email === 'lucas@patagoniadreams.com.ar') {
                document.getElementById('register-button').classList.remove('d-none');
            } else {
                document.getElementById('register-button').classList.add('d-none');
            }
        })
        .catch(error => {
            console.error("Error signing in:", error);
        });
}

function register() {
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;

    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email === 'lucas@patagoniadreams.com.ar') {
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                document.getElementById('register-form').classList.add('d-none');
                document.getElementById('main-content').classList.remove('d-none');
            })
            .catch(error => {
                console.error("Error registering:", error);
            });
    } else {
        console.error("No tienes permiso para registrar nuevos usuarios.");
    }
}

function logout() {
    auth.signOut().then(() => {
        document.getElementById('login-form').classList.remove('d-none');
        document.getElementById('main-content').classList.add('d-none');
        document.getElementById('register-form').classList.add('d-none');
    }).catch((error) => {
        console.error("Error logging out:", error);
    });
}

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('login-form').classList.add('d-none');
        document.getElementById('main-content').classList.remove('d-none');
    } else {
        document.getElementById('login-form').classList.remove('d-none');
        document.getElementById('main-content').classList.add('d-none');
    }
});

// Mostrar y ocultar el formulario de registro
function showRegisterForm() {
    document.getElementById('main-content').classList.add('d-none');
    document.getElementById('register-form').classList.remove('d-none');
}

function hideRegisterForm() {
    document.getElementById('register-form').classList.add('d-none');
    document.getElementById('main-content').classList.remove('d-none');
}

// Logging changes
function logChange(message) {
    db.ref('changes').push({
        message,
        timestamp: new Date().toLocaleString()
    });
}

// Displaying change logs
db.ref('changes').on('child_added', (snapshot) => {
    const changeData = snapshot.val();
    const changeDiv = document.createElement('p');
    changeDiv.textContent = `${changeData.timestamp}: ${changeData.message}`;
    const changeLog = document.getElementById('change-log');
    changeLog.insertBefore(changeDiv, changeLog.firstChild);
});

// Fullscreen functionality for vehicle table
function toggleVehicleTableFullscreen() {
    const vehicleTableContainer = document.getElementById('vehicle-table-container');
    if (!vehicleTableContainer.classList.contains('vehicle-table-fullscreen')) {
        vehicleTableContainer.classList.add('vehicle-table-fullscreen');
        vehicleTableContainer.innerHTML += '<span class="close-fullscreen" onclick="toggleVehicleTableFullscreen()">&times;</span>';
    } else {
        vehicleTableContainer.classList.remove('vehicle-table-fullscreen');
        const closeBtn = vehicleTableContainer.querySelector('.close-fullscreen');
        if (closeBtn) closeBtn.remove();
    }
}

// Play sound function
function playSound() {
    const sound = document.getElementById('chat-sound');
    sound.play();
}
