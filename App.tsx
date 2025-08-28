/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { generateAngleImage } from './services/geminiService';

const ANGLES = [
    'Side view', 'Back view', 'Low angle', 'High angle', 
    'Drone view', 'Wide view', 'Close-up'
];

const STYLES = [
    'Original', 'Anime', 'Photorealistic', 'Cartoon', 'Cyberpunk', 'Fantasy Art',
    'Art Nouveau', 'Pop Art', 'Impressionism', 'Minimalism', 'Gothic', 'Pixel Art'
];

const CAMERAS = [
    'None', 'Canon EOS R5', 'Nikon D850', 'Sony A7 III', 'Fujifilm Pro 400H', 'Leica M10'
];

const LENSES = [
    'None', 'Fisheye', 'Wide-angle', 'Macro', 'Anamorphic', 'Tilt-shift'
];


type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
    angle: string;
}

// --- Sub-components defined within App.tsx for simplicity ---

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
    </div>
);

const ErrorDisplay = ({ error }: { error?: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-500 text-xs font-semibold">Generation Failed</p>
        <p className="text-gray-500 text-xs mt-1 break-all">{error}</p>
    </div>
);

const ImageCard = ({ status, url, angle, error }: GeneratedImage) => (
    <div className="bg-yellow-100 rounded-lg overflow-hidden aspect-[4/5] relative flex items-center justify-center shadow-sm">
        {status === 'pending' && <LoadingSpinner />}
        {status === 'error' && <ErrorDisplay error={error} />}
        {status === 'done' && url && <img src={url} alt={`Generated image: ${angle}`} className="w-full h-full object-cover" />}
        
        <div className="absolute bottom-0 left-0 right-0 bg-stone-800/60 p-2 text-center">
            <p className="font-semibold text-sm text-white">{angle}</p>
        </div>
    </div>
);


export default function App() {
    const [apiKey, setApiKey] = useState<string>('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [selectedAngles, setSelectedAngles] = useState<string[]>([]);
    const [selectedStyle, setSelectedStyle] = useState<string>('Original');
    const [selectedCamera, setSelectedCamera] = useState<string>('None');
    const [selectedLens, setSelectedLens] = useState<string>('None');
    const [focalLength, setFocalLength] = useState<string>('');
    const [aperture, setAperture] = useState<string>('');
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setUploadedImage(reader.result as string);
            setGeneratedImages({});
        };
        reader.onerror = () => {
            console.error("Error reading file.");
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    }, []);

    const handleDragEvents = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const toggleAngle = (angle: string) => {
        setSelectedAngles(prev => 
            prev.includes(angle) ? prev.filter(a => a !== angle) : [...prev, angle]
        );
    };
    
    const handleSelectAllAngles = () => {
        if (selectedAngles.length === ANGLES.length) {
            setSelectedAngles([]);
        } else {
            setSelectedAngles(ANGLES);
        }
    };

    const getAnglePrompt = (angle: string): string => {
        switch (angle) {
            case 'Side view':
                return "Generate a full-profile side view of the character, showing them from the side as if the camera is positioned at a 90-degree angle. The character's entire side profile should be visible.";
            case 'Back view':
                return "Generate an image showing the character's full back view, directly from behind. Capture the details of their hair, clothing, and posture from the rear.";
            case 'Low angle':
                return "Generate a dramatic low-angle shot of the character, looking up at them from below. This perspective should make them appear taller and more imposing.";
            case 'High angle':
                return "Generate a high-angle shot of the character, as if viewed from above. This perspective should look down on the character, showing the top of their head and shoulders prominently.";
            case 'Drone view':
                return "Generate an extreme high-angle \"drone view\" or \"bird's-eye view\" of the character, looking straight down from directly overhead.";
            case 'Wide view':
                return "Generate a wide view shot that captures the character's full body from a distance. This shot should include some of the surrounding environment.";
            case 'Close-up':
                return "Generate a close-up shot of the character's face, focusing on their expression and facial details.";
            default:
                return `Generate a ${angle} of the character.`;
        }
    };

    const handleGenerateClick = async () => {
        if (!apiKey || !uploadedImage || selectedAngles.length === 0) {
            alert("Please provide a Gemini API key, upload an image, and select at least one angle.");
            return;
        }

        setIsLoading(true);
        const initialImages = selectedAngles.reduce((acc, angle) => {
            acc[angle] = { status: 'pending', angle };
            return acc;
        }, {} as Record<string, GeneratedImage>);
        setGeneratedImages(initialImages);

        const generationPromises = selectedAngles.map(async (angle) => {
            try {
                let prompt = getAnglePrompt(angle);

                if (selectedStyle !== 'Original') {
                    prompt += ` Apply a ${selectedStyle} artistic style.`;
                }
                if (selectedCamera !== 'None') {
                    prompt += ` The image should look as if it was taken with a ${selectedCamera} camera.`;
                }
                if (selectedLens !== 'None') {
                    prompt += ` Use a ${selectedLens} lens effect.`;
                }
                if (focalLength) {
                    prompt += ` The lens should have a focal length of ${focalLength}mm.`;
                }
                if (aperture) {
                    prompt += ` Use an aperture of f/${aperture}.`;
                }

                const imageUrl = await generateAngleImage(apiKey, uploadedImage, prompt);
                return { angle, status: 'done' as ImageStatus, url: imageUrl };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                return { angle, status: 'error' as ImageStatus, error: errorMessage };
            }
        });
        
        const results = await Promise.all(generationPromises);

        setGeneratedImages(prev => {
            const newImages = { ...prev };
            results.forEach(result => {
                newImages[result.angle] = { ...newImages[result.angle], ...result };
            });
            return newImages;
        });

        setIsLoading(false);
    };
    
    const ControlSection = ({ title, children, step }: { title: string, children: React.ReactNode, step: number }) => (
        <div className="bg-white/60 p-4 rounded-lg shadow-sm">
            <h3 className="font-bold text-lg mb-3 border-b-2 border-yellow-200 pb-2">
                {step}. {title}
            </h3>
            {children}
        </div>
    );
    
    return (
        <div className="bg-[#FFF8E1] min-h-screen text-[#4E342E] p-4 sm:p-8">
            <main className="max-w-screen-xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-yellow-600 tracking-wide">ME2BANANA</h1>
                    <p className="text-lg text-stone-700 mt-2">Go bananas! Create new angles of your character.</p>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* --- Left Column: Controls --- */}
                    <div className="lg:col-span-1 space-y-6">

                        <ControlSection title="Set API Key" step={1}>
                             <p className="text-sm text-stone-600 mb-2">
                                Enter your Google Gemini API key to begin. Your key is not stored.
                            </p>
                            <input 
                                type="password"
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="Enter your Gemini API Key"
                                className="w-full p-2 border border-yellow-300 rounded-md bg-white focus:ring-yellow-500 focus:border-yellow-500"
                            />
                        </ControlSection>

                        <ControlSection title="Upload Image" step={2}>
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragEvents}
                                onDragEnter={handleDragEvents}
                                onDragLeave={handleDragEvents}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isDragging ? 'border-yellow-500 bg-yellow-100' : 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'}`}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                {uploadedImage ? (
                                    <img src={uploadedImage} alt="Uploaded preview" className="mx-auto max-h-48 rounded-md object-contain" />
                                ) : (
                                    <p className="text-stone-600">Click or drag & drop to upload</p>
                                )}
                            </div>
                        </ControlSection>

                        <ControlSection title="Select Angles" step={3}>
                            <div className="flex justify-between items-center mb-3">
                                <p className="text-sm text-stone-600">Choose one or more views.</p>
                                <button onClick={handleSelectAllAngles} className="text-sm font-semibold bg-yellow-300 hover:bg-yellow-400 text-stone-800 px-3 py-1 rounded-md transition-colors">
                                    {selectedAngles.length === ANGLES.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {ANGLES.map(angle => (
                                    <button key={angle} onClick={() => toggleAngle(angle)} className={`p-2 rounded-md text-sm font-semibold transition-all duration-200 ${selectedAngles.includes(angle) ? 'bg-yellow-500 text-white shadow-md' : 'bg-yellow-100 hover:bg-yellow-200 text-stone-700'}`}>
                                        {angle}
                                    </button>
                                ))}
                            </div>
                        </ControlSection>

                        <ControlSection title="Customize Style & Camera" step={4}>
                           <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Style</label>
                                    <select value={selectedStyle} onChange={e => setSelectedStyle(e.target.value)} className="w-full p-2 border border-yellow-300 rounded-md bg-white focus:ring-yellow-500 focus:border-yellow-500">
                                        {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Camera</label>
                                    <select value={selectedCamera} onChange={e => setSelectedCamera(e.target.value)} className="w-full p-2 border border-yellow-300 rounded-md bg-white focus:ring-yellow-500 focus:border-yellow-500">
                                        {CAMERAS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Lens</label>
                                    <select value={selectedLens} onChange={e => setSelectedLens(e.target.value)} className="w-full p-2 border border-yellow-300 rounded-md bg-white focus:ring-yellow-500 focus:border-yellow-500">
                                        {LENSES.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-stone-700 mb-1">Focal Length (mm)</label>
                                        <input type="text" value={focalLength} onChange={e => setFocalLength(e.target.value)} placeholder="e.g., 85" className="w-full p-2 border border-yellow-300 rounded-md bg-white focus:ring-yellow-500 focus:border-yellow-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-stone-700 mb-1">Aperture (f/)</label>
                                        <input type="text" value={aperture} onChange={e => setAperture(e.target.value)} placeholder="e.g., 1.8" className="w-full p-2 border border-yellow-300 rounded-md bg-white focus:ring-yellow-500 focus:border-yellow-500" />
                                    </div>
                                </div>
                           </div>
                        </ControlSection>

                        <button
                            onClick={handleGenerateClick}
                            disabled={!apiKey || !uploadedImage || selectedAngles.length === 0 || isLoading}
                            className="w-full bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-yellow-600 transition-all duration-300 disabled:bg-stone-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            {isLoading && <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            <span>{isLoading ? 'Generating...' : `Generate ${selectedAngles.length} Image(s)`}</span>
                        </button>
                    </div>

                    {/* --- Right Column: Image Grid --- */}
                    <div className="lg:col-span-2">
                        {Object.keys(generatedImages).length === 0 ? (
                            <div className="flex items-center justify-center h-full bg-white/50 rounded-lg text-center p-8 border-2 border-dashed border-yellow-300">
                                <p className="text-stone-600">Your generated images will appear here!</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {Object.values(generatedImages).sort((a,b) => ANGLES.indexOf(a.angle) - ANGLES.indexOf(b.angle)).map(img => (
                                    <ImageCard key={img.angle} {...img} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}