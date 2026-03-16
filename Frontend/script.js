(function initializeSystem() {
    if (!localStorage.getItem('departments')) {
        const defaultDepts = [
            { name: 'Engineering', desc: 'Software and Hardware Team' },
            { name: 'HR', desc: 'Human Resources' },
            { name: 'CCS', desc: 'College of Computer Studies' },
            { name: 'Business', desc: 'Business & Accountancy' }
        ];
        localStorage.setItem('departments', JSON.stringify(defaultDepts));
    }
})();

let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
let editingEmail = null; 
let editingEmployeeId = null;
let editingDeptName = null;
let editingRequestId = null; 

function getAuthHeader() {
    const token = sessionStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

async function loadAdminDashboard() {
    try {
        const res = await fetch('http://localhost:3000/api/admin/dashboard', {
            headers: getAuthHeader()
        });

        const contentEl = document.getElementById('content'); 

        if (res.ok) {
            const data = await res.json();
            if (contentEl) contentEl.innerText = data.message;
            const adminNameDisplay = document.getElementById('admin-name-display');
            const adminEmailDisplay = document.getElementById('admin-email-display');
            if (adminNameDisplay) adminNameDisplay.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
            if (adminEmailDisplay) adminEmailDisplay.textContent = currentUser.email;
        } else {
            if (contentEl) contentEl.innerText = 'Access denied!';
            alert('Access denied! Server blocked this request.');
            window.location.hash = '#/dashboard';
        }
    } catch (err) {
        console.error("Failed to load admin dashboard", err);
    }
}

function navigateTo(hash) {
    window.location.hash = hash; 
}

function updateNavbar() {
    const publicNav = document.getElementById('nav-public');
    const adminNav = document.getElementById('nav-admin');
    const userNav = document.getElementById('nav-user');

    if (publicNav) publicNav.classList.add('d-none');
    if (adminNav) adminNav.classList.add('d-none');
    if (userNav) userNav.classList.add('d-none');

    if (!sessionStorage.getItem('authToken') || !currentUser) {
        if (publicNav) publicNav.classList.remove('d-none');
    } else if (currentUser.role === 'admin') {
        if (adminNav) adminNav.classList.remove('d-none');
    } else {
        if (userNav) userNav.classList.remove('d-none');
    }
}

function showDashboard(user) {
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    currentUser = user; 
    updateNavbar();
    if (user.role === 'admin') {
        window.location.hash = '#/admin-dashboard';
    } else {
        window.location.hash = '#/dashboard';
    }
}

async function login(email, password) {
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('authToken', data.token);
            showDashboard(data.user);
        } else {
            alert('Login failed: ' + data.error);
        }
    } catch (err) {
        alert('Network error');
    }
}

function handleRouting() {
    const hash = window.location.hash || '#/home'; 

    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none'; 
    });

    let pageId = 'home-page';

    switch(hash) {
        case '#/home':
            pageId = 'home-page';
            break;
        case '#/register':
            pageId = 'register-page';
            if (document.getElementById('register-form')) document.getElementById('register-form').reset();
            const regPw = document.getElementById('reg-password');
            if (regPw) regPw.type = 'password';
            break;
        case '#/login':
            pageId = 'login-page';
            if (document.getElementById('login-form')) document.getElementById('login-form').reset(); 
            const logPw = document.getElementById('login-password');
            if (logPw) logPw.type = 'password';
            break;
        case '#/admin-dashboard':
            if (!sessionStorage.getItem('authToken') || !currentUser || currentUser.role !== 'admin') {
                alert("Admin access only.");
                window.location.hash = currentUser ? '#/dashboard' : '#/login';
                return;
            }
            pageId = 'admin-dashboard-page';
            loadAdminDashboard(); 
            break;
        case '#/admin-employees':
            if (!sessionStorage.getItem('authToken') || !currentUser || currentUser.role !== 'admin') return navigateTo(currentUser ? '#/dashboard' : '#/login');
            pageId = 'admin-employees-page';
            renderEmployeesTable(); 
            break;
        case '#/admin-accounts':
            if (!sessionStorage.getItem('authToken') || !currentUser || currentUser.role !== 'admin') return navigateTo(currentUser ? '#/dashboard' : '#/login');
            pageId = 'admin-accounts-page';
            renderAccountsTable(); 
            break;
        case '#/dashboard':
            if (!sessionStorage.getItem('authToken') || !currentUser) {
                window.location.hash = '#/login'; 
                return;
            }
            pageId = 'welcome-page';
            const userNameDisplay = document.getElementById('user-name-display');
            const userEmailDisplay = document.getElementById('user-email-display');
            if (userNameDisplay) userNameDisplay.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
            if (userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
            break;
        case '#/admin-departments':
            if (!sessionStorage.getItem('authToken') || !currentUser || currentUser.role !== 'admin') return navigateTo(currentUser ? '#/dashboard' : '#/login');
            pageId = 'admin-departments-page';
            renderDepartmentsTable(); 
            break;
        case '#/my-requests':
            if (!sessionStorage.getItem('authToken') || !currentUser) {
                window.location.hash = '#/login';
                return;
            }
            pageId = 'admin-requests-page';
            renderRequestsTable();
            break;
        default:
            pageId = 'home-page';
    }

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
        activePage.style.display = 'block';
    }
    
    updateNavbar();
}

window.addEventListener('hashchange', handleRouting);
window.addEventListener('load', handleRouting);

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const emailInput = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        login(emailInput.value, passwordInput.value);
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault(); 
        const firstNameInput = document.getElementById('reg-firstname');
        const lastNameInput = document.getElementById('reg-lastname');
        const emailInput = document.getElementById('reg-email');
        const passwordInput = document.getElementById('reg-password');

        if (passwordInput.value.length < 6) { 
            alert("Password must be at least 6 characters."); 
            return; 
        }

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    firstName: firstNameInput.value,
                    lastName: lastNameInput.value,
                    email: emailInput.value, 
                    password: passwordInput.value 
                })
            });
            const data = await response.json();

            if (response.ok) {
                alert("Registration successful! You can now log in.");
                window.location.hash = '#/login';
            } else {
                alert('Registration failed: ' + data.error); 
            }
        } catch (err) {
            alert('Network error');
        }
    });
}

window.logout = function() {
    currentUser = null;
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    updateNavbar(); 
    window.location.hash = '#/login';
}

window.toggleRegPassword = function() {
    const pwInput = document.getElementById('reg-password');
    if (pwInput && pwInput.type === 'password') pwInput.type = 'text';
    else if (pwInput) pwInput.type = 'password';
};

window.toggleLoginPassword = function() {
    const pwInput = document.getElementById('login-password');
    if (pwInput && pwInput.type === 'password') pwInput.type = 'text';
    else if (pwInput) pwInput.type = 'password';
};

window.toggleAdminPassword = function() {
    const pwInput = document.getElementById('acc-password');
    if (pwInput && pwInput.type === 'password') pwInput.type = 'text';
    else if (pwInput) pwInput.type = 'password';
};

async function renderAccountsTable() {
    const tbody = document.getElementById('accounts-table-body');
    const msg = document.getElementById('no-accounts-msg');
    
    try {
        const response = await fetch('http://localhost:3000/api/users');
        const users = await response.json();
        
        tbody.innerHTML = '';

        if (users.length === 0) {
            msg.classList.remove('d-none');
        } else {
            msg.classList.add('d-none');
            users.forEach(user => {
                const isMe = currentUser && user.email === currentUser.email;
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="ps-4 align-middle fw-bold">${user.firstName} ${user.lastName}</td>
                    <td class="align-middle">${user.email}</td>
                    <td class="align-middle">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</td>
                    <td class="align-middle">
                        ${user.verified ? '<span class="badge bg-success">✔</span>' : '<span class="badge bg-warning text-dark">Pending</span>'}
                    </td>
                    <td class="align-middle text-center">
                        <button class="btn btn-sm btn-outline-primary me-1" onclick="editAccount('${user.email}')">Edit</button>
                        <button class="btn btn-sm btn-outline-warning me-1" onclick="resetPassword('${user.email}')">Reset Password</button>
                        ${isMe ? '' : `<button class="btn btn-sm btn-outline-danger" onclick="deleteAccount('${user.email}')">Delete</button>`}
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

window.toggleAccountForm = function() {
    const formCard = document.getElementById('account-form-card');
    if (formCard.classList.contains('d-none')) {
        resetAccountFormUI();
    }
    formCard.classList.toggle('d-none');
}

function resetAccountFormUI() {
    document.getElementById('admin-add-account-form').reset();
    editingEmail = null; 
    document.querySelector('#account-form-card .card-header').textContent = "Add Account";
    document.querySelector('#admin-add-account-form button[type="submit"]').textContent = "Save";
    document.getElementById('acc-email').disabled = false; 
    
    const accPw = document.getElementById('acc-password');
    if(accPw) accPw.type = 'password'; 
    const showAccPw = document.getElementById('show-acc-password');
    if(showAccPw) showAccPw.checked = false;
}

const adminAddForm = document.getElementById('admin-add-account-form');
if (adminAddForm) {
    adminAddForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const firstName = document.getElementById('acc-firstname').value;
        const lastName = document.getElementById('acc-lastname').value;
        const email = document.getElementById('acc-email').value;
        const password = document.getElementById('acc-password').value;
        const role = document.getElementById('acc-role').value;
        let verified = document.getElementById('acc-verified').checked; 

        if (!email.includes('@')) verified = false;

        const payload = { firstName, lastName, email, password, role, verified };

        try {
            if (editingEmail) {
                await fetch(`http://localhost:3000/api/users/${editingEmail}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                const res = await fetch('http://localhost:3000/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!res.ok) {
                    const data = await res.json();
                    alert(data.error);
                    return;
                }
            }

            toggleAccountForm(); 
            renderAccountsTable(); 
        } catch (err) {
            alert("Error communicating with backend server.");
        }
    });
}

window.editAccount = async function(email) {
    try {
        const response = await fetch('http://localhost:3000/api/users');
        const users = await response.json();
        const user = users.find(u => u.email === email);
        if (!user) return;

        const formCard = document.getElementById('account-form-card');
        formCard.classList.remove('d-none');

        document.getElementById('acc-firstname').value = user.firstName;
        document.getElementById('acc-lastname').value = user.lastName;
        document.getElementById('acc-email').value = user.email;
        document.getElementById('acc-password').value = ""; 
        document.getElementById('acc-role').value = user.role;
        document.getElementById('acc-verified').checked = user.verified;

        editingEmail = user.email;
        document.getElementById('acc-email').disabled = true; 
        document.querySelector('#account-form-card .card-header').textContent = "Edit Account";
        document.querySelector('#admin-add-account-form button[type="submit"]').textContent = "Update";
        
        formCard.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error(err);
    }
};

window.resetPassword = async function(email) {
    const newPw = prompt(`Enter new password for ${email}:`);
    if (newPw && newPw.length >= 6) {
        try {
            await fetch(`http://localhost:3000/api/users/${email}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPw })
            });
            alert("Password reset successfully on the server.");
        } catch (err) {
            alert("Failed to reset password on server.");
        }
    } else if (newPw) {
        alert("Password must be at least 6 characters.");
    }
};

window.deleteAccount = async function(emailToDelete) {
    if(!confirm(`Are you sure you want to delete ${emailToDelete}?`)) return;
    try {
        await fetch(`http://localhost:3000/api/users/${emailToDelete}`, {
            method: 'DELETE'
        });
        renderAccountsTable(); 
    } catch (err) {
        alert("Failed to delete account from server.");
    }
};

function populateDepartmentDropdown() {
    const selectEl = document.getElementById('emp-dept');
    if (!selectEl) return;
    selectEl.innerHTML = ''; 
    let departments = JSON.parse(localStorage.getItem('departments')) || [];

    if (departments.length === 0) {
        const opt = document.createElement('option');
        opt.value = "";
        opt.textContent = "-- Please create a Department first --";
        opt.disabled = true;
        opt.selected = true;
        selectEl.appendChild(opt);
    } else {
        departments.forEach(dept => {
            const opt = document.createElement('option');
            opt.value = dept.name; 
            opt.textContent = dept.name;
            selectEl.appendChild(opt);
        });
    }
}

function renderEmployeesTable() {
    populateDepartmentDropdown(); 
    const tbody = document.getElementById('employees-table-body');
    const msg = document.getElementById('no-employees-msg');
    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    
    tbody.innerHTML = '';

    if (employees.length === 0) {
        msg.classList.remove('d-none');
    } else {
        msg.classList.add('d-none');
        employees.forEach(emp => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="ps-4 align-middle fw-bold">${emp.id}</td>
                <td class="align-middle">${emp.email}</td>
                <td class="align-middle">${emp.position}</td>
                <td class="align-middle"><span class="badge bg-secondary">${emp.department}</span></td>
                <td class="text-center align-middle">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editEmployee('${emp.id}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteEmployee('${emp.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

window.toggleEmployeeForm = function() {
    const formCard = document.getElementById('employee-form-card');
    if (formCard.classList.contains('d-none')) {
        resetEmployeeFormUI();
    }
    formCard.classList.toggle('d-none');
}

function resetEmployeeFormUI() {
    document.getElementById('admin-add-employee-form').reset();
    editingEmployeeId = null;
    document.querySelector('#employee-form-card .card-header').textContent = "Add Employee";
    document.querySelector('#admin-add-employee-form button[type="submit"]').textContent = "Save";
    document.getElementById('emp-id').disabled = false;
}

const adminEmpForm = document.getElementById('admin-add-employee-form');
if (adminEmpForm) {
    adminEmpForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = document.getElementById('emp-id').value;
        const email = document.getElementById('emp-email').value;
        const position = document.getElementById('emp-position').value;
        const department = document.getElementById('emp-dept').value;
        const hireDate = document.getElementById('emp-date').value;

        let employees = JSON.parse(localStorage.getItem('employees')) || [];

        if (editingEmployeeId) {
            const index = employees.findIndex(e => e.id === editingEmployeeId);
            if (index !== -1) {
                employees[index].email = email;
                employees[index].position = position;
                employees[index].department = department;
                employees[index].hireDate = hireDate;
            }
        } else {
            if (employees.find(e => e.id === id)) return;
            const newEmp = { id, email, position, department, hireDate };
            employees.push(newEmp);
        }

        localStorage.setItem('employees', JSON.stringify(employees));
        adminEmpForm.reset();
        toggleEmployeeForm();
        renderEmployeesTable();
    });
}

window.editEmployee = function(id) {
    const employees = JSON.parse(localStorage.getItem('employees')) || [];
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    const formCard = document.getElementById('employee-form-card');
    formCard.classList.remove('d-none');

    document.getElementById('emp-id').value = emp.id;
    document.getElementById('emp-email').value = emp.email;
    document.getElementById('emp-position').value = emp.position;
    document.getElementById('emp-dept').value = emp.department;
    document.getElementById('emp-date').value = emp.hireDate;

    editingEmployeeId = emp.id;
    document.getElementById('emp-id').disabled = true; 
    document.querySelector('#employee-form-card .card-header').textContent = "Edit Employee";
    document.querySelector('#admin-add-employee-form button[type="submit"]').textContent = "Update";
    formCard.scrollIntoView({ behavior: 'smooth' });
};

window.deleteEmployee = function(idToDelete) {
    if(!confirm(`Delete Employee ID: ${idToDelete}?`)) return;
    let employees = JSON.parse(localStorage.getItem('employees')) || [];
    employees = employees.filter(e => e.id !== idToDelete);
    localStorage.setItem('employees', JSON.stringify(employees));
    renderEmployeesTable();
};

function renderDepartmentsTable() {
    const tbody = document.getElementById('departments-table-body');
    const msg = document.getElementById('no-departments-msg');
    let departments = JSON.parse(localStorage.getItem('departments')) || [];

    tbody.innerHTML = '';

    if (departments.length === 0) {
        msg.classList.remove('d-none');
    } else {
        msg.classList.add('d-none');
        departments.forEach(dept => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="ps-4 align-middle fw-bold">${dept.name}</td>
                <td class="align-middle">${dept.desc}</td>
                <td class="align-middle text-center">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editDepartment('${dept.name}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteDepartment('${dept.name}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

window.toggleDepartmentForm = function() {
    const formCard = document.getElementById('department-form-card');
    if (formCard.classList.contains('d-none')) resetDepartmentFormUI();
    formCard.classList.toggle('d-none');
}

function resetDepartmentFormUI() {
    document.getElementById('admin-add-department-form').reset();
    editingDeptName = null;
    document.querySelector('#department-form-card .card-header').textContent = "Add Department";
    document.querySelector('#admin-add-department-form button[type="submit"]').textContent = "Save";
    document.getElementById('dept-name').disabled = false;
}

const adminDeptForm = document.getElementById('admin-add-department-form');
if (adminDeptForm) {
    adminDeptForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = document.getElementById('dept-name').value;
        const desc = document.getElementById('dept-desc').value;
        let departments = JSON.parse(localStorage.getItem('departments')) || [];

        if (editingDeptName) {
            const index = departments.findIndex(d => d.name === editingDeptName);
            if (index !== -1) departments[index].desc = desc; 
        } else {
            if (departments.find(d => d.name === name)) return;
            departments.push({ name, desc });
        }

        localStorage.setItem('departments', JSON.stringify(departments));
        adminDeptForm.reset();
        toggleDepartmentForm();
        renderDepartmentsTable();
    });
}

window.editDepartment = function(name) {
    const departments = JSON.parse(localStorage.getItem('departments')) || [];
    const dept = departments.find(d => d.name === name);
    if (!dept) return;

    const formCard = document.getElementById('department-form-card');
    formCard.classList.remove('d-none');
    document.getElementById('dept-name').value = dept.name;
    document.getElementById('dept-desc').value = dept.desc;
    editingDeptName = dept.name;
    document.getElementById('dept-name').disabled = true; 
    document.querySelector('#department-form-card .card-header').textContent = "Edit Department";
    document.querySelector('#admin-add-department-form button[type="submit"]').textContent = "Update";
    formCard.scrollIntoView({ behavior: 'smooth' });
};

window.deleteDepartment = function(nameToDelete) {
    if(!confirm(`Delete Department: ${nameToDelete}?`)) return;
    let departments = JSON.parse(localStorage.getItem('departments')) || [];
    departments = departments.filter(d => d.name !== nameToDelete);
    localStorage.setItem('departments', JSON.stringify(departments));
    renderDepartmentsTable();
};

function renderRequestsTable() {
    const emptyState = document.getElementById('requests-empty-state');
    const tableContainer = document.getElementById('requests-table-container');
    const tbody = document.getElementById('requests-table-body');
    let requests = JSON.parse(localStorage.getItem('requests')) || [];

    if (currentUser && currentUser.role !== 'admin') {
        requests = requests.filter(r => r.ownerEmail === currentUser.email);
    }

    if (requests.length === 0) {
        emptyState.classList.remove('d-none');
        tableContainer.classList.add('d-none');
    } else {
        emptyState.classList.add('d-none');
        tableContainer.classList.remove('d-none');
        tbody.innerHTML = '';
        requests.forEach(req => {
            const status = req.status || 'Pending'; 
            let badgeClass = 'bg-warning text-dark'; 
            if (status === 'Approved') badgeClass = 'bg-success'; 
            else if (status === 'Cancelled') badgeClass = 'bg-danger'; 

            let statusDropdown = '';
            if (currentUser && currentUser.role === 'admin') {
                statusDropdown = `
                    <div class="dropdown d-inline-block me-1">
                        <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                            Set Status
                        </button>
                        <ul class="dropdown-menu shadow-sm">
                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="changeReqStatus('${req.id}', 'Pending')">Pending</a></li>
                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="changeReqStatus('${req.id}', 'Approved')">Approved</a></li>
                            <li><a class="dropdown-item" href="javascript:void(0)" onclick="changeReqStatus('${req.id}', 'Cancelled')">Cancelled</a></li>
                        </ul>
                    </div>
                `;
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="ps-4 align-middle fw-bold">REQ-${req.id}</td>
                <td class="align-middle">${req.type}<br><small class="text-muted">${req.ownerEmail}</small></td>
                <td class="align-middle">${req.items.length} items</td>
                <td class="align-middle"><span class="badge ${badgeClass}">${status}</span></td>
                <td class="align-middle text-center">
                    ${statusDropdown}
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editRequest('${req.id}')">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteRequest('${req.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
}

window.openNewRequestModal = function() {
    editingRequestId = null;
    document.getElementById('request-form').reset();
    document.querySelector('#requestModal .modal-title').textContent = "New Request";
    document.querySelector('#request-form button[type="submit"]').textContent = "Submit Request";
    document.getElementById('req-items-container').innerHTML = `
        <div class="row g-2 mb-2 item-row">
            <div class="col-8"><input type="text" class="form-control item-name" placeholder="Item name" required></div>
            <div class="col-2"><input type="number" class="form-control item-qty" value="1" min="1" required></div>
            <div class="col-2"><button type="button" class="btn btn-outline-secondary w-100" onclick="addItemRow()">+</button></div>
        </div>
    `;
    new bootstrap.Modal(document.getElementById('requestModal')).show();
};

window.editRequest = function(id) {
    const requests = JSON.parse(localStorage.getItem('requests')) || [];
    const req = requests.find(r => r.id == id); 
    if (!req) return;

    editingRequestId = req.id;
    document.querySelector('#requestModal .modal-title').textContent = "Edit Request";
    document.querySelector('#request-form button[type="submit"]').textContent = "Update Request";
    document.getElementById('req-type').value = req.type;

    const container = document.getElementById('req-items-container');
    container.innerHTML = ''; 

    req.items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'row g-2 mb-2 item-row';
        const isLast = index === req.items.length - 1;
        const btnHtml = isLast 
            ? `<button type="button" class="btn btn-outline-secondary w-100" onclick="addItemRow()">+</button>`
            : `<button type="button" class="btn btn-outline-danger w-100" onclick="this.closest('.item-row').remove()">x</button>`;

        div.innerHTML = `
            <div class="col-8"><input type="text" class="form-control item-name" value="${item.name}" required></div>
            <div class="col-2"><input type="number" class="form-control item-qty" value="${item.qty}" min="1" required></div>
            <div class="col-2">${btnHtml}</div>
        `;
        container.appendChild(div);
    });

    new bootstrap.Modal(document.getElementById('requestModal')).show();
};

window.addItemRow = function() {
    const container = document.getElementById('req-items-container');
    
    const rows = container.getElementsByClassName('item-row');
    if (rows.length > 0) {
        const lastRow = rows[rows.length - 1];
        const cols = lastRow.querySelectorAll('.col-2');
        
        if (cols.length > 1) {
            cols[1].innerHTML = `<button type="button" class="btn btn-outline-danger w-100" onclick="this.closest('.item-row').remove()">x</button>`;
        }
    }

    const div = document.createElement('div');
    div.className = 'row g-2 mb-2 item-row';
    div.innerHTML = `
        <div class="col-8">
            <input type="text" class="form-control item-name" placeholder="Item name" required>
        </div>
        <div class="col-2">
            <input type="number" class="form-control item-qty" value="1" min="1" required>
        </div>
        <div class="col-2">
            <button type="button" class="btn btn-outline-secondary w-100" onclick="addItemRow()">+</button>
        </div>
    `;
    container.appendChild(div);
};

const requestForm = document.getElementById('request-form');
if (requestForm) {
    requestForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const itemRows = document.querySelectorAll('.item-row');
        const items = [];
        itemRows.forEach(row => {
            const name = row.querySelector('.item-name').value;
            const qty = row.querySelector('.item-qty').value;
            if(name) items.push({ name, qty });
        });

        const type = document.getElementById('req-type').value;
        let requests = JSON.parse(localStorage.getItem('requests')) || [];
        
        if (editingRequestId) {
            const index = requests.findIndex(r => r.id == editingRequestId);
            if (index !== -1) {
                requests[index].type = type;
                requests[index].items = items;
            }
        } else {
            const newReq = {
                id: Date.now().toString().slice(-4), 
                type,
                items,
                date: new Date().toISOString().split('T')[0],
                status: 'Pending',
                ownerEmail: currentUser.email 
            };
            requests.push(newReq);
        }

        localStorage.setItem('requests', JSON.stringify(requests));
        const modalEl = document.getElementById('requestModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl); 
        if(modalInstance) modalInstance.hide();
        renderRequestsTable();
    });
}

window.deleteRequest = function(id) {
    if(!confirm("Delete this request?")) return;
    let requests = JSON.parse(localStorage.getItem('requests')) || [];
    requests = requests.filter(r => r.id != id);
    localStorage.setItem('requests', JSON.stringify(requests));
    renderRequestsTable();
};

window.changeReqStatus = function(id, newStatus) {
    let requests = JSON.parse(localStorage.getItem('requests')) || [];
    const index = requests.findIndex(r => r.id == id);
    if (index !== -1) {
        requests[index].status = newStatus;
        localStorage.setItem('requests', JSON.stringify(requests));
        renderRequestsTable(); 
    }
};