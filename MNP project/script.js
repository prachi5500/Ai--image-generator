// --- IMPORTANT: Replace with your actual API Key and Base URL ---
const API_KEY = 'sk-Q975wZRhs54mwHfAQjsCK5VcyYXm3eaaaCa26At9UiOyzOSC'; // Replace with your actual key
const BASE_API_URL = 'https://api.stability.ai/v1/generation/';

// Get references to HTML elements based on your provided HTML structure
const promptForm = document.querySelector('.prompt-form');
const promptInput = document.querySelector('.prompt-input');

const modelSelect = document.getElementById('modelSelect');
const imageCountSelect = document.getElementById('imageCountSelect');
const aspectRatioSelect = document.getElementById('aspectRatioSelect');

const generateBtn = document.querySelector('.generate-btn');
const galleryGrid = document.querySelector('.gallary-grid');
const themeButton = document.querySelector('.theme'); // Get the theme toggle button

// Mapping for your custom model names to actual Stability AI model IDs
const modelMapping = {
    "flux.1-dev": "stable-diffusion-xl-1024-v1-0",
    "dell.e": "stable-diffusion-xl-1024-v1-0",
    "stable-diffusion-xl-1024-v1-0": "stable-diffusion-xl-1024-v1-0",
    "stable-diffusion-v1-6": "stable-diffusion-v1-6"
};

// --- Initialize Dropdown Options ---
function populateDropdowns() {
    modelSelect.value = "stable-diffusion-xl-1024-v1-0";
    imageCountSelect.value = "1";
    aspectRatioSelect.value = "1:1";
}

// Call to populate dropdowns on page load
document.addEventListener('DOMContentLoaded', populateDropdowns);

// --- Event Listeners ---
promptForm.addEventListener('submit', handleGenerateSubmit);

// --- Theme Toggle Functionality ---
themeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');

    // Optionally change the icon based on theme
    const themeIcon = themeButton.querySelector('i');
    if (document.body.classList.contains('dark-theme')) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
});


// --- Main Image Generation Logic ---
async function handleGenerateSubmit(event) {
    event.preventDefault();

    const prompt = promptInput.value.trim();
    const selectedModelVisual = modelSelect.value;
    const actualApiModelId = modelMapping[selectedModelVisual] || "stable-diffusion-xl-1024-v1-0";

    const numImages = parseInt(imageCountSelect.value);
    const aspectRatio = aspectRatioSelect.value;

    if (!prompt) {
        alert('Please describe your imagination in detail!');
        return;
    }
    if (!selectedModelVisual) {
        alert('Please select an AI Model!');
        return;
    }
    if (isNaN(numImages) || numImages < 1 || numImages > 4) {
        alert('Please select a valid image count (1-4)!');
        return;
    }
    if (!aspectRatio) {
        alert('Please select an Aspect Ratio!');
        return;
    }

    let width, height;
    const defaultSDXLSize = 1024;
    const defaultSDSize = 512;

    const baseDim = actualApiModelId.includes('xl') ? defaultSDXLSize : defaultSDSize;

    switch (aspectRatio) {
        case '1:1':
            width = baseDim;
            height = baseDim;
            break;
        case '16:9':
            width = baseDim;
            height = Math.round(baseDim * (9 / 16));
            break;
        case '9:16':
            width = Math.round(baseDim * (9 / 16));
            height = baseDim;
            break;
        default:
            width = baseDim;
            height = baseDim;
            break;
    }

    width = Math.round(width / 64) * 64;
    height = Math.round(height / 64) * 64;

    setupImageCardsForLoading(numImages);

    const API_ENDPOINT = `${BASE_API_URL}${actualApiModelId}/text-to-image`;

    try {
        for (let i = 0; i < numImages; i++) {
            const card = galleryGrid.children[i];
            const spinner = card.querySelector('.spinner');
            const statusText = card.querySelector('.status-text');
            const resultImg = card.querySelector('.result-img');
            const imgOverlay = card.querySelector('.img-overlay');

            card.classList.add('loading');
            spinner.style.display = 'block';
            statusText.textContent = `Generating image ${i + 1} of ${numImages}...`;
            resultImg.style.display = 'none';
            imgOverlay.style.display = 'none';


            const response = await fetch(API_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    text_prompts: [
                        { text: prompt, weight: 1 }
                    ],
                    cfg_scale: 7,
                    height: height,
                    width: width,
                    samples: 1,
                    steps: 30,
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(`API Error for image ${i+1}:`, errorData);
                let errorMessage = `Failed to generate image ${i+1}: ${errorData.message || response.statusText}.`;
                if (response.status === 401) {
                    errorMessage += " Check your API key or subscription.";
                } else if (response.status === 400 && errorData.errors && errorData.errors.length > 0) {
                     errorMessage += ` Details: ${errorData.errors.map(err => err.message).join(', ')}`;
                }
                statusText.textContent = `Error: ${errorMessage.substring(0, 50)}...`;
                spinner.style.display = 'none';
                card.classList.remove('loading');
                continue;
            }

            const data = await response.json();

            if (data.artifacts && data.artifacts.length > 0) {
                const base64Image = data.artifacts[0].base64;
                resultImg.src = `data:image/png;base64,${base64Image}`;
                resultImg.onload = () => {
                    spinner.style.display = 'none';
                    statusText.textContent = '';
                    resultImg.style.display = 'block';
                    imgOverlay.style.display = 'flex';
                    card.classList.remove('loading');
                };
            } else {
                statusText.textContent = 'No image data received.';
                spinner.style.display = 'none';
                card.classList.remove('loading');
            }
        }
    } catch (error) {
        console.error('Overall generation error:', error);
        for (let i = 0; i < numImages; i++) {
            const card = galleryGrid.children[i];
            if (card.classList.contains('loading')) {
                card.querySelector('.spinner').style.display = 'none';
                card.querySelector('.status-text').textContent = `Generation failed: ${error.message.substring(0, 40)}...`;
                card.classList.remove('loading');
            }
        }
    }
}


function setupImageCardsForLoading(count) {
    for (let i = 0; i < galleryGrid.children.length; i++) {
        galleryGrid.children[i].style.display = 'none';
    }

    for (let i = 0; i < count; i++) {
        const card = galleryGrid.children[i];
        const spinner = card.querySelector('.spinner');
        const statusText = card.querySelector('.status-text');
        const resultImg = card.querySelector('.result-img');
        const imgOverlay = card.querySelector('.img-overlay');
        const downloadBtn = card.querySelector('.img-download-btn');

        card.style.display = 'flex';
        card.classList.remove('loading');
        card.classList.add('loading');
        spinner.style.display = 'block';
        statusText.textContent = 'Generating...';
        resultImg.style.display = 'none';
        imgOverlay.style.display = 'none';
        resultImg.src = '';

        downloadBtn.onclick = (event) => {
            event.stopPropagation();
            downloadImage(resultImg.src, `generated_image_${i+1}.png`);
        };
    }

    if (count === 1) {
        galleryGrid.style.gridTemplateColumns = '1fr';
    } else if (count === 2) {
        galleryGrid.style.gridTemplateColumns = '1fr 1fr';
    } else {
        galleryGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(180px, 1fr))';
    }
}

async function downloadImage(imageSrc, fileName) {
    if (!imageSrc || imageSrc.startsWith('data:image/png;base64,') === false) {
        alert('No image to download or image data is invalid.');
        return;
    }

    try {
        const link = document.createElement('a');
        link.href = imageSrc;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('Error downloading image:', error);
        alert('Failed to download image. Please try again.');
    }
}