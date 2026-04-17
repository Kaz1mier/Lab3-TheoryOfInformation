
function modPow(base, exp, mod) {
    base = BigInt(base);
    exp = BigInt(exp);
    mod = BigInt(mod);

    let result = 1n;
    base %= mod;

    while (exp > 0n) {
        if (exp % 2n) result = (result * base) % mod;
        base = (base * base) % mod;
        exp /= 2n;
    }
    return result;
}

function gcd(a, b) {
    a = BigInt(a);
    b = BigInt(b);
    while (b !== 0n) {
        [a, b] = [b, a % b];
    }
    return a;
}

function isPrime(n) {
    n = BigInt(n);
    if (n < 2n) return false;
    for (let i = 2n; i * i <= n; i++) {
        if (n % i === 0n) return false;
    }
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
        let ok = true;

        for (let q of factors) {
            if (modPow(g, phi / q, p) === 1n) {
                ok = false;
                break;
            }
        }

        if (ok) roots.push(g);
    }

    return roots;
}


async function saveFile(blob, suggestedName) {
    if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
            suggestedName
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
    } else {
        let url = URL.createObjectURL(blob);
        let a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        a.click();
        URL.revokeObjectURL(url);
    }
}


function processFile(isEncrypt) {
    let fileInput = document.getElementById('fileInput');

    let p = BigInt(document.getElementById('p').value);
    let g = BigInt(document.getElementById('g').value);
    let x = BigInt(document.getElementById('x').value);
    let k = BigInt(document.getElementById('k').value);

    if (!isPrime(p)) {
        alert("p должно быть простым");
        return;
    }

    if (p <= 255n) {
        alert("p должно быть больше 255");
        return;
    }

    if (gcd(k, p - 1n) !== 1n) {
        alert("k должно быть взаимно простым с p-1");
        return;
    }

    if (!fileInput.files.length) {
        alert("Выберите файл");
        return;
    }

    let reader = new FileReader();

    reader.onload = async function(e) {
        try {
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
                document.getElementById('output').value = text;

                let blob = new Blob([text]);
                saveFile(blob, "enc_" + fileInput.files[0].name);

            } else {
                let text = new TextDecoder().decode(bytes);
                let lines = text.trim().split("\n");

                let resultBytes = [];

                for (let line of lines) {
                    let [a, b] = line.split(",").map(v => BigInt(v));
                    let m = (b * modPow(a, p - 1n - x, p)) % p;
                    resultBytes.push(Number(m));
                }

                let outBytes = new Uint8Array(resultBytes);
                let blob = new Blob([outBytes]);

                document.getElementById('output').value = "Файл расшифрован";

                saveFile(blob, "dec_" + fileInput.files[0].name);
            }

        } catch (err) {
            alert("Ошибка: " + err.message);
        }
    };

    reader.readAsArrayBuffer(fileInput.files[0]);
}

document.getElementById('findRootsBtn').addEventListener('click', () => {
    let p = BigInt(document.getElementById('p').value);

    if (!isPrime(p)) {
        alert("p должно быть простым");
        return;
    }

    let roots = findPrimitiveRoots(p);
    let select = document.getElementById('g');
    select.innerHTML = "";

    roots.forEach(r => {
        let opt = document.createElement("option");
        opt.value = r;
        opt.text = r;
        select.appendChild(opt);
    });
});

document.getElementById('encryptBtn').addEventListener('click', () => {
    processFile(true);
});

document.getElementById('decryptBtn').addEventListener('click', () => {
    processFile(false);
});
