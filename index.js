
function modPow(g, x, p) {
    g = BigInt(g);
    x = BigInt(x);
    p = BigInt(p);

    let result = 1n;
    g %= p;

    while (x > 0n) {
        if (x % 2n) result = (result * g) % p;
        g = (g * g) % p;
        x /= 2n;
    }
    return result;
}

function gcd(a, b) {
    while (b !== 0n) [a, b] = [b, a % b];
    return a;
}

function isPrime(n) {
    if (n < 2n) return false;
    for (let i = 2n; i * i <= n; i++)
        if (n % i === 0n) return false;
    return true;
}

function primeFactors(n) {
    let factors = new Set();
    let d = 2n;

    while (d * d <= n) {
        while (n % d === 0n) {
            factors.add(d);
            n /= d;
        }
        d++;
    }
    if (n > 1n) factors.add(n);
    return [...factors];
}

function findPrimitiveRoots(p) {
    let phi = p - 1n;
    let factors = primeFactors(phi);
    let roots = [];

    for (let g = 2n; g < p; g++) {
        let isCorrect = true;
        for (let q of factors) {
            if (modPow(g, phi / q, p) === 1n) {
                isCorrect = false;
                break;
            }
        }
        if (isCorrect) roots.push(g);
    }
    return roots;
}


async function saveFile(blob, name) {
    if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({ suggestedName: name });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    } else {
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    }
}

let currentRoots = [];

function validate(p, g, x, k, isEncrypt) {
    if (!isPrime(p)) return "p должно быть простым";
    if (p <= 255n) return "p должно быть > 255";

    if (x <= 1n || x >= p - 1n)
        return "x должно быть: 1 < x < p-1";

    if (!currentRoots.includes(g))
        return "g не является первообразным корнем";
    if (isEncrypt) {
        if (gcd(k, p - 1n) !== 1n)
            return "k должно быть взаимно простым с p-1";
        if (k <= 1n || k >= p - 1n)
            return "k должно быть: 1 < k < p-1";
    }
    return null;
}


function processFile(isEncrypt) {
    let file = document.getElementById('fileInput').files[0];
    if (!file) return alert("Выберите файл");

    let p = BigInt(document.getElementById('p').value);
    let g = BigInt(document.getElementById('g').value);
    let x = BigInt(document.getElementById('x').value);
    let k = 0n;
    if (isEncrypt) {
        k = BigInt(document.getElementById('k').value);
    }

    let error = validate(p, g, x, k, isEncrypt);
    if (error) return alert(error);
    let reader = new FileReader();

    reader.onload = async function(e) {
        let bytes = new Uint8Array(e.target.result);
        if (isEncrypt) {
            let y = modPow(g, x, p);
            let result = [];
            for (let byte of bytes) {
                let m = BigInt(byte);

                let a = modPow(g, k, p);
                let b = (modPow(y, k, p) * m) % p;

                result.push(`${a},${b}`);
            }
            let text = result.join("\n");
            document.getElementById('output').value =
                `Открытый ключ:
                p=${p}
                g=${g}
                y=${y}
                Количество первообразных корней: ${currentRoots.length}
                Зашифрованные данные (пары a, b):
                ${text}\`;
                `;
            await saveFile(new Blob([text]), "enc_" + file.name);
        } else {
            let textReader = new FileReader();
            textReader.onload = function(event) {
                let text = event.target.result;
                let lines = text.trim().split("\n");
                let out = [];
                try {
                    for (let line of lines) {
                        if (!line.includes(',')) continue;

                        let [a, b] = line.split(",").map(BigInt);

                        let m = (b * modPow(a, p - 1n - x, p)) % p;
                        out.push(Number(m));
                    }
                    saveFile(
                        new Blob([new Uint8Array(out)]),
                        "dec_" + file.name.replace("enc_", "")
                    );
                    document.getElementById('output').value =
                        "Файл успешно расшифрован";
                } catch (e) {
                    alert("Ошибка формата файла");
                }
            };
            textReader.readAsText(file);
        }
    };
    reader.readAsArrayBuffer(file);
}



function getNextPrime(n) {
    let candidate = BigInt(n) + 1n;
    while (!isPrime(candidate)) {
        candidate++;
    }
    return candidate;
}

function getPrevPrime(n) {
    let candidate = BigInt(n) - 1n;
    if (candidate < 2n) return 2n;
    while (candidate > 2n && !isPrime(candidate)) {
        candidate--;
    }
    return candidate;
}


document.getElementById('p').addEventListener('keydown', function(e) {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();

        let currentValue = this.value ? BigInt(this.value) : 256n;
        let newValue;

        if (e.key === 'ArrowUp') {
            newValue = getNextPrime(currentValue);
        } else if (e.key === 'ArrowDown') {
            newValue = getPrevPrime(currentValue);
        }

        this.value = newValue.toString();

        document.getElementById('rootsCount').textContent = "";
        document.getElementById('g').innerHTML = "";
    }
});


document.getElementById('findRootsBtn').onclick = () => {
    const pInput = document.getElementById('p').value;
    const countDisplay = document.getElementById('rootsCount');

    if (!pInput) {
        alert("Введите p");
        return;
    }

    let p = BigInt(pInput);

    if (!isPrime(p)) {
        countDisplay.textContent = "Число не простое!";
        countDisplay.style.color = "#ff4c4c";
        return;
    }

    countDisplay.textContent = "Поиск...";
    countDisplay.style.color = "#4CAF50";

    setTimeout(() => {
        currentRoots = findPrimitiveRoots(p);

        let select = document.getElementById('g');
        select.innerHTML = "";

        currentRoots.forEach(r => {
            let opt = document.createElement("option");
            opt.value = r;
            opt.text = r;
            select.appendChild(opt);
        });

        countDisplay.textContent = "Найдено корней: " + currentRoots.length;
    }, 10);
};

document.getElementById('encryptBtn').onclick = () => processFile(true);
document.getElementById('decryptBtn').onclick = () => processFile(false);
