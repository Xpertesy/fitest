//let net;

(async function () {
    (params = {}), (r = /([^&=]+)=?([^&]*)/g);

    function d(s) {
        return decodeURIComponent(s.replace(/\+/g, " "));
    }
    var match,
        search = location.search;
    while ((match = r.exec(search.substring(1))))
        params[d(match[1])] = d(match[2]);
    //net = await posenet.load();

})();

const imageScaleFactor = 0.50;
const flipHorizontal = false;
const outputStride = 16;

//const imageElement = document.getElementById('cat');
// load the posenet model

//const pose = await net.estimateSinglePose(imageElement, scaleFactor, flipHorizontal, outputStride);

// Video capturing setup
const videoElement = document.getElementById("hidenVideo");

const canvas = document.getElementById('fitnessCanvas');
const button = document.getElementById('startStopButton');
const buttonInstructions = document.getElementById('playInstructions');
const anglesDisplay = document.getElementById('anglesDisplay');
const statusDisplay = document.getElementById('statusDisplay');
const context = canvas.getContext('2d');
const exerciseSelector = document.getElementById('exerciseSelector');
const title = document.getElementById('maintitle');
let exerciseCounting = null;
let exerciseAssistance = noEx;
const CAMERA_VIEW_SIDE = params['side'];
const CAMERA_VIEW_SIDE_LEFT = 0;
const CAMERA_VIEW_SIDE_RIGHT = 1;


let detector;
(async function initDetector() {
    updateStatus("Warming model...");

    const detectorConfig = { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER };
    detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, detectorConfig);
    updateStatus("Model is ready...");

    //console.log(detector);
})();


//let bodyPose = ml5.bodyPose();
//let bodyPose = ml5.bodyPose("BlazePose");
//let detector
//const connections = bodyPose.getSkeleton();
let poses = [];

// Set canvas size dynamically
const setCanvasSize = () => {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = canvas.width * 0.6; // Adjust height proportionally if needed
};
// Initialize canvas size on load and resize
setCanvasSize();
window.addEventListener('resize', setCanvasSize);


// Define BlazePose connections excluding face landmarks
const blazePoseConnections = [
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], [6, 12], [5, 11],
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]
];

// Mediapipe Pose setup
// const pose = new Pose({
//     locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
// });
// pose.setOptions({
//     modelComplexity: 1,
//     smoothLandmarks: true,
//     enableSegmentation: false,
//     smoothSegmentation: true,
//     minDetectionConfidence: 0.9,
//     minTrackingConfidence: 0.5
// });
// pose.onResults((results) => {
//     canvas.width = window.innerWidth * 0.9;
//     canvas.height = canvas.width * results.image.height / results.image.width;
//     context.clearRect(0, 0, canvas.width, canvas.height);
//     //drawMirroredImage(results.image);
//     context.drawImage(results.image, 0, 0, canvas.width, canvas.height);

//     if (results.poseLandmarks) {
//         // Draw skeleton
//         drawSkeleton(results.poseLandmarks);

//         // Draw keypoints
//         results.poseLandmarks.forEach((landmark, index) => {
//             if (index >= 11 && index <= 32 && landmark.visibility > 0.5) { // Ignore face landmarks
//                 context.beginPath();
//                 context.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
//                 context.fillStyle = "red";
//                 context.fill();
//             }
//         });

//         // Update angles
//         updateAnglesDisplay(results.poseLandmarks);
//     }
// });
function onFrameNone() { }
let onFrameFunc = onFrame;

// // Start Mediapipe Camera
const camera = new Camera(videoElement, {
    onFrame: onFrameFunc,
    //width: 1280,
    //height: 720
});


async function onFrame() {
    onFrameFunc = onFrameNone;
    canvas.width = window.innerWidth * 0.9;
    canvas.height = canvas.width * videoElement.videoHeight / videoElement.videoWidth;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    poses = await detector.estimatePoses(canvas);
    if (poses && poses.length > 0) {
        onBodyPoseResult(poses[0]);
        _draw(poses[0].keypoints);
    }

    //bodyPose.detect(canvas, onBodyPoseResult);
    //await pose.send({ image: videoElement });
}

// Calculate angle between three points
const calculateAngle = (a, b, c) => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * (180 / Math.PI));
    if (angle > 180) angle = 360 - angle;
    return angle;
};

// Draw connections between keypoints
// const drawSkeleton = (landmarks) => {
//     context.strokeStyle = "blue";
//     context.lineWidth = 3;

//     blazePoseConnections.forEach(([start, end]) => {
//         const startPoint = landmarks[start];
//         const endPoint = landmarks[end];

//         if (startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
//             context.beginPath();
//             context.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
//             context.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
//             context.stroke();
//         }
//     });
// };
const angles = {};
// Update angles display
const updateAnglesDisplay = (landmarks) => {
    try {
        if (landmarks) {
            // Right side angles
            angles.rightElbow = calculateAngle(landmarks[6], landmarks[8], landmarks[10]);
            angles.rightShoulder = calculateAngle(landmarks[8], landmarks[6], landmarks[12]);
            angles.rightHip = calculateAngle(landmarks[6], landmarks[12], landmarks[14]);
            angles.rightKnee = calculateAngle(landmarks[12], landmarks[14], landmarks[16]);

            // Left side angles
            angles.leftElbow = calculateAngle(landmarks[5], landmarks[7], landmarks[9]);
            angles.leftShoulder = calculateAngle(landmarks[7], landmarks[5], landmarks[11]);
            angles.leftHip = calculateAngle(landmarks[5], landmarks[11], landmarks[13]);
            angles.leftKnee = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);

            anglesDisplay.textContent = `
                Right Hip: ${angles.rightHip.toFixed(1)}°, 
                Right Knee: ${angles.rightKnee.toFixed(1)}°, 
            `;

            exerciseAssistance(angles);
        }
    } catch (error) {
        console.error(error + " : " + landmarks);
    }
};

// function drawMirroredImage(image) {
//     context.save();
//     context.scale(-1, 1);
//     context.drawImage(image, -canvas.width, 0, canvas.width, canvas.height);
//     context.restore();
// }


// Start/Stop button functionality
let isRunning = false;
button.addEventListener('click', startStopButtonClick);
buttonInstructions.addEventListener('click', playInstructionsClick);

function playInstructionsClick() {
    if (exeConfig) {
        compileAndPlayInstructions();
        fileVideoElement.play();
    }
}

function startStopButtonClick() {
    if (isRunning) {
        stopButtonClick();
    } else {
        startButtonClick();
    }
}

function startButtonClick() {
    isRunning = true;
    button.textContent = 'Stop';
    camera.start();
    startExerciseAssistance();
    console.log('Pose detection started');
}

function stopButtonClick() {
    isRunning = false;
    button.textContent = 'Start';
    isRecording = false;
    camera.stop();
    stopExerciseAssistance();
    console.log('Pose detection stopped');
}

function startExerciseAssistance() {
    isStarted = false;
    exeConfig = null;

    exerciseAssistance = exeAssistent[EXE_TYPE];// squatsAssistance;
}

function stopExerciseAssistance() {
    exerciseAssistance = noEx;
    //exeConfig = null;
}

function updateStatus(status) {
    statusDisplay.textContent = status;
    // playVoice(status);
}

function compileAndPlayInstructions() {
    let notice = "";
    if (Object.keys(exeConfig.incorrectInstructions).length > 0) {
        Object.keys(exeConfig.incorrectInstructions).forEach(key => {
            notice = notice + " - " + exeConfig.incorrectInstructions[key];
            playVoice(exeConfig.incorrectInstructions[key]);
        });
    }
    else {
        Object.keys(exeConfig.correctInstructions).forEach(key => {
            notice = notice + " - " + exeConfig.correctInstructions[key];
            playVoice(exeConfig.correctInstructions[key]);
        });
    }
    anglesDisplay.textContent = notice;

    //playVoice(notice);
}
function noEx(angles) { }

const EXE_TYPE = params['type'];

const exeAssistent = {
    'squats': squatsAssistance,
    'legspush': legspushAssistance,
    'pullhorisontal': pullhorisontalAssistance,
    'pulltop': pulltopAssistance,
    'backbridge': backbridgeAssistance
};

const titles = {
    'squats': 'Squats',
    'legspush': 'Legs Push',
    'pullhorisontal': 'Horisontal Pull',
    'pulltop': 'Pull Top',
    'backbridge': 'Back Bridge'
};

title.textContent = titles[EXE_TYPE];
// title.textContent = title.textContent + ' Test'
if (CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_LEFT) {
    title.textContent = title.textContent + ' Left View'
}
else if (CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT) {
    title.textContent = title.textContent + ' Right View'
}

let squatsCorrectVoiceInstructions = [
    "Good job, keep your back straight!", //0            
    "Great range of motion!", //1
    "You're sitting low, well done!", //2
    "You're keeping your knees out to the sides well!" //3
];

let legspushCorrectVoiceInstructions = [
    "Good job!",//0
    "Great range of motion!", //1
    "You're pulling low, well done!", //2
];
let pullhorisontalCorrectVoiceInstructions = [
    "Good job!", //0
    "Great range of motion!", //1
];
let pulltopCorrectVoiceInstructions = ["Good job!"];

let backbridgeCorrectVoiceInstructions = [
    "Good job!"
];

let squatsIncorrectVoiceInstructions = [
    "Sit deeper!", //0
    "Don't sit too low, watch your knees!", //1
    "Straighten your back and lower back!", //2
    "Move your pelvis further back!", //3            
    "Knees out to the sides!", //4
    "Don't round your back! Keep your neck straight!", //5
    "Breathe in through your nose and slowly sit down", //6
    "Exhale as you stand up!", //7
    "Push your heels into the floor as you stand up!", //8
    "Don't forget to breathe!", //9
    "Press your heels into the floor!", //10
];

let legspushIncorrectVoiceInstructions = [
    "You can go lower!", //0
    "Don't pull too low, watch your knees!", //1
    "Spread your knees out to the sides and don't straighten them all the way!", //2
    "Don't rush! Bend your legs more slowly!", //3
    "Don't forget to breathe!", //4
];
let pullhorisontalIncorrectVoiceInstructions = [
    "Pull it closer to your stomach!",//0
    "Don't round your back! Keep your neck straight!",//1
    "Don't fall back, keep your back straight and your chest forward!", //2
    "Don't raise your shoulders, keep your hands down!",//3
    "Don't straighten your arms all the way!",//4
    "Don't rush! Move more slowly!", //5
    "You can move faster!" //6
];

let pulltopIncorrectVoiceInstructions = [
    "Pull lower, try harder!",//0
    "Don't pull too low. Pull the handle as far as your nose.",//1
    "Don't straighten your arms all the way, keep the tension.", //2
];


let backbridgeIncorrectVoiceInstructions = [
    "Sit deeper!", //0
    "Lift your pelvis higher. Push to the max.", //1
];


const correctVoiceInstructionsSet = {
    'squats': squatsCorrectVoiceInstructions,
    'legspush': legspushCorrectVoiceInstructions,
    'pullhorisontal': pullhorisontalCorrectVoiceInstructions,
    'pulltop': pulltopCorrectVoiceInstructions,
    'backbridge': backbridgeCorrectVoiceInstructions
};

const incorrectVoiceInstructionsSet = {
    'squats': squatsIncorrectVoiceInstructions,
    'legspush': legspushIncorrectVoiceInstructions,
    'pullhorisontal': pullhorisontalIncorrectVoiceInstructions,
    'pulltop': pulltopIncorrectVoiceInstructions,
    'backbridge': backbridgeIncorrectVoiceInstructions
}
function getNewExeConfig(theAngle, theHipAngle) {
    return {
        counter: 0,
        moveCounter: 0,
        angle: theAngle,
        minAngle: theAngle,
        maxAngle: theAngle,
        minHipAngle: theHipAngle,
        maxHipAngle: theHipAngle,
        startTime: Date.now(),
        dirCount: 0,
        incorrectInstructions: {},
        correctInstructions: {},
        direction: EXCERCISE_DIRECTION_NONE //(0) - none, (1) - down, (-1) - up
    };
}

function resetMinMax(exeConfig) {
    exeConfig.minAngle = 180;
    exeConfig.maxAngle = 0;
    exeConfig.minHipAngle = 180;
    exeConfig.maxHipAngle = 0;
    exeConfig.moveCounter = 0;
}
const correctVoiceInstructions = correctVoiceInstructionsSet[EXE_TYPE];
const incorrectVoiceInstructions = incorrectVoiceInstructionsSet[EXE_TYPE];

let exeConfig = null;
const EXCERCISE_DIRECTION_UP = -1;
const EXCERCISE_DIRECTION_DOWN = 1;
const EXCERCISE_DIRECTION_NONE = 0;

let minAngle = 45;
let downAmplitude = 30;
let maxAngle = 180;
let upAmplitude = 30;
let directionCounter = 10;
let invalidRange = [75, 150];
let maxMoveCounter = 120;

let isStarted = false;

function squatsAssistance(angles) {
    onFrameFunc = onFrame;

    const theAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightKnee.toFixed(1))) : Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    // const theAngle = Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    // const theHipAngle = Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    if (theAngle < 0 || theHipAngle < 0) {
        return;
    }
    if (!exeConfig) {
        exeConfig = getNewExeConfig(theAngle, theHipAngle);
        minAngle = 50;
        downAmplitude = 30;
        maxAngle = 180;
        upAmplitude = 30;
        directionCounter = 10;
        invalidRange = [75, 150];
        if (!isRecording && camera.g) {
            onGotRecordingStream(camera.g);
        }
        updateStatus('Seeking for direction...');
    }

    if (exeConfig.moveCounter > 60 && exeConfig.direction != EXCERCISE_DIRECTION_NONE) {
        console.log("notice: exeConfig.moveCounter > 60");

        if (isStarted) {
            stopButtonClick();
            playVoice("Exercise is completed!");
        }
        else {
            opsFalseExeDetection(exeConfig.counter);
            exeConfig = null;
            resetRecordings();
        }
        return;
    }
    // if (Math.abs(exeConfig.angle - theAngle) > 30.0) {
    //     isStarted = false;
    // }
    exeConfig.maxAngle = Math.max(exeConfig.maxAngle, theAngle);
    exeConfig.minAngle = Math.min(exeConfig.minAngle, theAngle);
    exeConfig.maxHipAngle = Math.max(exeConfig.maxHipAngle, theHipAngle);
    exeConfig.minHipAngle = Math.min(exeConfig.minHipAngle, theHipAngle);
    exeConfig.moveCounter++;


    let direction = exeConfig.direction == 0 ? 'none' : (exeConfig.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${exeConfig.angle}, minAngle: ${exeConfig.minAngle}, maxAngle: ${exeConfig.maxAngle}, dirCount: ${exeConfig.dirCount}, counter: ${exeConfig.counter}, startTime: ${exeConfig.startTime}`);
    if (exeConfig.angle < theAngle) //up
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount--;

        if (exeConfig.dirCount < - directionCounter) {
            exeConfig.dirCount = 0;
            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_UP;
                resetMinMax(exeConfig);
                updateStatus(`Direction: up. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_UP) {//Changed direction from down to up
                if (exeConfig.minAngle > 95.0) {
                    console.log("notice: exeConfig.minAngle > 95.0");

                    if (isStarted) {
                        stopButtonClick();
                        playVoice("Exercise is completed!");
                    }
                    else {
                        opsFalseExeDetection(exeConfig.counter);
                        exeConfig = null;
                        resetRecordings();
                    }
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_UP;
                    exeConfig.counter++;
                    if (exeConfig.counter == 2) {
                        //playVoice("Exercise is started!");
                    }
                    isStarted = exeConfig.counter > 1;
                    updateStatus(`Direction: up. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);
                    if (exeConfig.minAngle > minAngle + downAmplitude) {
                        exeConfig.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(exeConfig.incorrectInstructions[0] + ":" + exeConfig.minAngle);
                    }
                    else if (exeConfig.minAngle < minAngle) {
                        exeConfig.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(exeConfig.incorrectInstructions[1]);
                    }
                    else if (exeConfig.minHipAngle < 30.0) {
                        exeConfig.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(exeConfig.incorrectInstructions[2] + ":" + exeConfig.minHipAngle);
                    }
                    else if (exeConfig.minHipAngle > 75.0) {
                        exeConfig.incorrectInstructions[3] = incorrectVoiceInstructions[3];
                        console.log(exeConfig.incorrectInstructions[3]);
                    }
                    let notice = "" + (exeConfig.counter);
                    playVoice(notice);
                    console.log(notice + ":" + exeConfig.angle);

                    resetMinMax(exeConfig);
                }
            }
        }
    }
    else if (exeConfig.angle > theAngle) //down
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount++;

        if (exeConfig.dirCount > directionCounter) {
            exeConfig.dirCount = 0;

            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_DOWN;
                exeConfig.startTime = Date.now();
                resetMinMax(exeConfig);
                updateStatus(`Direction: down. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_DOWN)//Change direction from up to down
            {
                if (theAngle < 100 && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log("notice: theAngle < 100");
                }
                else if (exeConfig.angle - theAngle > 20 && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log("notice: exeConfig.angle - theAngle > 20");
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_DOWN;
                    updateStatus(`Direction: down. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);

                    if (exeConfig.maxAngle > 176.0) {
                        exeConfig.incorrectInstructions[4] = incorrectVoiceInstructions[4];
                        console.log(exeConfig.incorrectInstructions[4]);
                    }
                    else if (Math.round(exeConfig.maxAngle + 0.5) < 160.0 && exeConfig.maxAngle > 150.0) {
                        exeConfig.incorrectInstructions[5] = incorrectVoiceInstructions[5];
                        console.log(exeConfig.incorrectInstructions[5]);
                    }
                    else if (exeConfig.startTime > 0 && exeConfig.counter > 0) {
                        const period = Date.now() - exeConfig.startTime;
                        if (period > 2000 && period < 2500) {
                            exeConfig.incorrectInstructions[6] = incorrectVoiceInstructions[6];
                            console.log(exeConfig.incorrectInstructions[6] + ":" + period);
                        }
                        else if (period > 15000) {
                            exeConfig.incorrectInstructions[7] = incorrectVoiceInstructions[7];
                            console.log(exeConfig.incorrectInstructions[7]);
                        }
                    }
                    else if (exeConfig.minHipAngle < 45) {
                        exeConfig.incorrectInstructions[8] = incorrectVoiceInstructions[8];
                        console.log(exeConfig.incorrectInstructions[8]);
                    }
                    else if (exeConfig.maxAngle - exeConfig.minAngle > 110) {
                        exeConfig.incorrectInstructions[1] = correctVoiceInstructions[1];
                        console.log(exeConfig.correctInstructions[1]);
                    }
                    else if (exeConfig.minAngle < 55.0) {
                        exeConfig.incorrectInstructions[2] = correctVoiceInstructions[2];
                        console.log(exeConfig.correctInstructions[2]);
                    }
                    else {
                        exeConfig.incorrectInstructions[0] = correctVoiceInstructions[0];
                    }
                    resetMinMax(exeConfig);
                    exeConfig.startTime = Date.now();
                }
            }
        }
    }
    try {
        if (exeConfig) {
            exeConfig.angle = theAngle;
        }
    } catch (error) {
        console.error(error);
    }
}

function legspushAssistance(angles) {
    const theAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightKnee.toFixed(1))) : Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    // const theAngle = Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    // const theHipAngle = Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    if (theAngle < 0 || theHipAngle < 0) {
        return;
    }
    if (!exeConfig) {
        exeConfig = getNewExeConfig(theAngle, theHipAngle);
        minAngle = 90;
        downAmplitude = 20;
        maxAngle = 160;
        upAmplitude = 20;
        directionCounter = 10;
        invalidRange = [70, 150];
        if (!isRecording && camera.g) {
            onGotRecordingStream(camera.g);
        }
    }
    exeConfig.maxAngle = Math.max(exeConfig.maxAngle, theAngle);
    exeConfig.minAngle = Math.min(exeConfig.minAngle, theAngle);
    exeConfig.maxHipAngle = Math.max(exeConfig.maxHipAngle, theHipAngle);
    exeConfig.minHipAngle = Math.min(exeConfig.minHipAngle, theHipAngle);

    let direction = exeConfig.direction == 0 ? 'none' : (exeConfig.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${exeConfig.angle}, minAngle: ${exeConfig.minAngle}, maxAngle: ${exeConfig.maxAngle}, dirCount: ${exeConfig.dirCount}, counter: ${exeConfig.counter}, startTime: ${exeConfig.startTime}`);
    if (exeConfig.angle < theAngle) //up
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount--;

        if (exeConfig.dirCount < - directionCounter) {
            exeConfig.dirCount = 0;

            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_UP;
                resetMinMax(exeConfig);
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_UP) {//Changed direction from down to up
                if (exeConfig.minAngle > 135.0) {
                    console.log("notice: exeConfig.minAngle > 135.0");
                    if (isStarted) {
                        startStopButtonClick();
                        playVoice("Exercise is completed!");
                    }
                    else {
                        opsFalseExeDetection(exeConfig.counter);
                        exeConfig = null;
                        resetRecordings();
                    }
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_UP;
                    exeConfig.counter++;
                    if (exeConfig.counter == 2) {
                        //playVoice("Exercise is started!");
                    }
                    isStarted = exeConfig.counter > 1;

                    if (exeConfig.minAngle > minAngle + downAmplitude) {
                        exeConfig.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(exeConfig.incorrectInstructions[0]);
                    }
                    else if (exeConfig.minAngle < minAngle) {
                        exeConfig.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(exeConfig.incorrectInstructions[1]);
                    }
                    let notice = "" + (exeConfig.counter);
                    playVoice(notice);
                    console.log(notice + ":" + exeConfig.angle);

                    resetMinMax(exeConfig);
                }
            }
        }
    }
    else if (exeConfig.angle > theAngle) //down
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount++;

        if (exeConfig.dirCount > directionCounter) {
            exeConfig.dirCount = 0;

            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_DOWN;
                resetMinMax(exeConfig);
                exeConfig.startTime = Date.now();
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_DOWN)//Change direction from up to down
            {
                if (theAngle < 105.0 && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log(`notice: theAngle < 105, theAngle:${theAngle}`);
                }
                else if (exeConfig.angle - theAngle > 20 && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log("notice: exeConfig.angle - theAngle > 20");
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_DOWN;

                    if (exeConfig.maxAngle > maxAngle) {
                        exeConfig.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(exeConfig.incorrectInstructions[2]);
                    }
                    else if (exeConfig.startTime > 0 && exeConfig.counter > 0) {
                        const period = Date.now() - exeConfig.startTime;
                        if (period > 2000 && period < 3000) {
                            exeConfig.incorrectInstructions[3] = incorrectVoiceInstructions[3];
                            console.log(exeConfig.incorrectInstructions[3]);
                        }
                        else if (period > 15000) {
                            exeConfig.incorrectInstructions[4] = incorrectVoiceInstructions[4];
                            console.log(exeConfig.incorrectInstructions[4]);
                        }
                    }
                    else if (exeConfig.maxAngle - exeConfig.minAngle > 60) {
                        exeConfig.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(exeConfig.correctInstructions[1]);
                    }
                    else if (exeConfig.minAngle < 85.0) {
                        exeConfig.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(exeConfig.correctInstructions[2]);
                    }
                    else {
                        exeConfig.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(exeConfig.correctInstructions[0]);
                    }

                    resetMinMax(exeConfig);
                    exeConfig.startTime = Date.now();
                }
            }
        }
    }

    try {
        if (exeConfig) {
            exeConfig.angle = theAngle;
        }
    } catch (error) {
        console.error(error);
    }

}

function pullhorisontalAssistance(angles) {

    const theAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightElbow.toFixed(1))) : Math.floor(parseFloat(angles.leftElbow.toFixed(1)));
    const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));


    // const theAngle = Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    // const theHipAngle = Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    if (theAngle < 0 || theHipAngle < 0) {
        return;
    }
    if (!exeConfig) {
        exeConfig = getNewExeConfig(theAngle, theHipAngle);
        minAngle = 45;
        downAmplitude = 20;
        maxAngle = 180;
        upAmplitude = 20;
        directionCounter = 10;
        invalidRange = [70, 150];
        if (!isRecording && camera.g) {
            onGotRecordingStream(camera.g);
        }
    }
    exeConfig.maxAngle = Math.max(exeConfig.maxAngle, theAngle);
    exeConfig.minAngle = Math.min(exeConfig.minAngle, theAngle);
    exeConfig.maxHipAngle = Math.max(exeConfig.maxHipAngle, theHipAngle);
    exeConfig.minHipAngle = Math.min(exeConfig.minHipAngle, theHipAngle);

    let direction = exeConfig.direction == 0 ? 'none' : (exeConfig.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${exeConfig.angle}, minAngle: ${exeConfig.minAngle}, maxAngle: ${exeConfig.maxAngle}, dirCount: ${exeConfig.dirCount}, counter: ${exeConfig.counter}, startTime: ${exeConfig.startTime}`);
    if (exeConfig.angle < theAngle) //up
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount--;

        if (exeConfig.dirCount < - directionCounter) {
            exeConfig.dirCount = 0;

            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_UP;
                resetMinMax(exeConfig);
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_UP) {//Changed direction from down to up
                if (exeConfig.minAngle > 95.0) {
                    console.log("notice: exeConfig.minAngle > 95.0");
                    exeConfig = null;

                    if (isStarted) {
                        startStopButtonClick();
                        playVoice("Exercise is completed!");
                    }
                    else {
                        opsFalseExeDetection(exeConfig.counter);
                        exeConfig = null;
                        resetRecordings();
                    }
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_UP;
                    exeConfig.counter++;
                    if (exeConfig.counter == 2) {
                        //playVoice("Exercise is started!");
                    }
                    isStarted = exeConfig.counter > 1;

                    if (exeConfig.minAngle > minAngle + downAmplitude) {
                        exeConfig.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(exeConfig.incorrectInstructions[0]);
                    }
                    else if (exeConfig.minAngle < minAngle) {
                        exeConfig.incorrectInstructions[3] = incorrectVoiceInstructions[3];
                        console.log(exeConfig.incorrectInstructions[3]);
                    }
                    else if (exeConfig.minHipAngle < 75.0) {
                        exeConfig.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(exeConfig.incorrectInstructions[1]);
                    }
                    else if (exeConfig.minHipAngle > 95.0) {
                        exeConfig.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(exeConfig.incorrectInstructions[2]);
                    }
                    let notice = "" + (exeConfig.counter);
                    playVoice(notice);
                    console.log(notice + ":" + exeConfig.angle);

                    resetMinMax(exeConfig);
                }
            }
        }
    }
    else if (exeConfig.angle > theAngle) //down
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount++;

        if (exeConfig.dirCount > directionCounter) {
            exeConfig.dirCount = 0;

            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_DOWN;
                resetMinMax(exeConfig);
                exeConfig.startTime = Date.now();
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_DOWN)//Change direction from up to down
            {
                if (theAngle < 100 && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log("notice: theAngle < 100");
                }
                else if (exeConfig.angle - theAngle > 20 && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log("notice: exeConfig.angle - theAngle > 20");
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_DOWN;

                    if (exeConfig.maxAngle > 176.0) {
                        exeConfig.incorrectInstructions[4] = incorrectVoiceInstructions[4];
                        console.log(exeConfig.incorrectInstructions[4]);
                    }
                    else if (exeConfig.startTime > 0 && exeConfig.counter > 0) {
                        const period = Date.now() - exeConfig.startTime;
                        if (period > 2000 && period < 3000) {
                            exeConfig.incorrectInstructions[5] = incorrectVoiceInstructions[5];
                            console.log(exeConfig.incorrectInstructions[5]);
                        }
                        else if (period > 15000) {
                            exeConfig.incorrectInstructions[6] = incorrectVoiceInstructions[6];
                            console.log(exeConfig.incorrectInstructions[6]);
                        }
                    }
                    else if (exeConfig.maxAngle - exeConfig.minAngle > 110) {
                        exeConfig.correctInstructions[1] = correctVoiceInstructions[1];
                        console.log(exeConfig.correctInstructions[1]);
                    }
                    else {
                        exeConfig.correctInstructions[0] = correctVoiceInstructions[0];
                        console.log(exeConfig.correctInstructions[0]);
                    }

                    resetMinMax(exeConfig);
                    exeConfig.startTime = Date.now();
                }
            }
        }
    }

    try {
        if (exeConfig) {
            exeConfig.angle = theAngle;
        }
    } catch (error) {
        console.error(error);
    }

}

function backbridgeAssistance(angles) {
    onFrameFunc = onFrame;

    // const theAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightKnee.toFixed(1))) : Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    // const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    // const theAngle = Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    // const theHipAngle = Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));
    const theAngle = theHipAngle;

    if (theAngle < 0 || theHipAngle < 0) {
        return;
    }
    if (!exeConfig) {
        exeConfig = getNewExeConfig(theAngle, theHipAngle);
        minAngle = 45;
        downAmplitude = 20;
        maxAngle = 180;
        upAmplitude = 20;
        directionCounter = 5;
        invalidRange = [75, 150];
        if (!isRecording && camera.g) {
            onGotRecordingStream(camera.g);
        }
        updateStatus('Seeking for direction...');
    }

    if (exeConfig.moveCounter > maxMoveCounter && exeConfig.direction != EXCERCISE_DIRECTION_NONE) {
        console.log(`notice: exeConfig.moveCounter > ${maxMoveCounter}`);

        if (isStarted) {
            stopButtonClick();
            playVoice("Exercise is completed!");
        }
        else {
            opsFalseExeDetection(exeConfig.counter);
            exeConfig = null;
            resetRecordings();
        }
        return;
    }
    // if (Math.abs(exeConfig.angle - theAngle) > 30.0) {
    //     isStarted = false;
    // }
    exeConfig.maxAngle = Math.max(exeConfig.maxAngle, theAngle);
    exeConfig.minAngle = Math.min(exeConfig.minAngle, theAngle);
    exeConfig.maxHipAngle = Math.max(exeConfig.maxHipAngle, theHipAngle);
    exeConfig.minHipAngle = Math.min(exeConfig.minHipAngle, theHipAngle);
    exeConfig.moveCounter++;


    let direction = exeConfig.direction == 0 ? 'none' : (exeConfig.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${exeConfig.angle}, minAngle: ${exeConfig.minAngle}, maxAngle: ${exeConfig.maxAngle}, moveCounter: ${exeConfig.moveCounter}, dirCount: ${exeConfig.dirCount}, kneeAngle: ${angles.leftKnee.toFixed(1)}, counter: ${exeConfig.counter}, startTime: ${exeConfig.startTime}`);
    if (exeConfig.angle < theAngle) //up
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount--;

        if (exeConfig.dirCount < - directionCounter) {
            exeConfig.dirCount = 0;
            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_UP;
                resetMinMax(exeConfig);
                updateStatus(`Direction: up. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_UP) {//Changed direction from down to up
                if (exeConfig.minAngle > 120.0) {
                    console.log("notice: exeConfig.minAngle > 120.0");

                    if (isStarted) {
                        stopButtonClick();
                        playVoice("Exercise is completed!");
                    }
                    else {
                        opsFalseExeDetection(exeConfig.counter);
                        exeConfig = null;
                        resetRecordings();
                    }
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_UP;
                    // exeConfig.counter++;
                    // if (exeConfig.counter == 2) {
                    //     //playVoice("Exercise is started!");
                    // }
                    // isStarted = exeConfig.counter > 1;
                    updateStatus(`Direction: up. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);
                    if (isStarted && exeConfig.minAngle > minAngle + downAmplitude) {
                        exeConfig.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(exeConfig.incorrectInstructions[0] + ":" + exeConfig.minAngle);
                    }
                    // else if (exeConfig.maxAngle < maxAngle - upAmplitude) {
                    //     exeConfig.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                    //     console.log(exeConfig.incorrectInstructions[1]);
                    // }
                    // else if (exeConfig.minHipAngle < 30.0) {
                    //     // exeConfig.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                    //     // console.log(exeConfig.incorrectInstructions[2] + ":" + exeConfig.minHipAngle);
                    // }
                    // else if (exeConfig.minHipAngle > 75.0) {
                    //     // exeConfig.incorrectInstructions[3] = incorrectVoiceInstructions[3];
                    //     // console.log(exeConfig.incorrectInstructions[3]);
                    // }
                    // let notice = "" + (exeConfig.counter);
                    // playVoice(notice);
                    // console.log(notice + ":" + exeConfig.angle);
                    resetMinMax(exeConfig);
                }
            }
        }
    }
    else if (exeConfig.angle > theAngle) //down
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount++;

        if (exeConfig.dirCount > directionCounter) {
            exeConfig.dirCount = 0;

            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_DOWN;
                exeConfig.startTime = Date.now();
                resetMinMax(exeConfig);
                updateStatus(`Direction: down. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_DOWN)//Change direction from up to down
            {
                if (exeConfig.maxAngle < 150 && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log("notice: theAngle < 100");
                }
                else if (exeConfig.angle - theAngle > 20 && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log("notice: exeConfig.angle - theAngle > 20");
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_DOWN;
                    exeConfig.counter++;
                    if (exeConfig.counter == 2) {
                        //playVoice("Exercise is started!");
                    }
                    isStarted = exeConfig.counter > 1;

                    updateStatus(`Direction: down. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);

                    if (exeConfig.maxAngle < maxAngle - upAmplitude) {
                        exeConfig.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(exeConfig.incorrectInstructions[1]);
                    }
                    else {
                        exeConfig.correctInstructions[0] = correctVoiceInstructions[0];
                        console.log(exeConfig.correctInstructions[0]);
                    }

                    let notice = "" + (exeConfig.counter);
                    playVoice(notice);
                    console.log(notice + ":" + exeConfig.angle);

                    // else if (exeConfig.maxAngle > 176.0) {
                    //     // exeConfig.incorrectInstructions[4] = incorrectVoiceInstructions[4];
                    //     // console.log(exeConfig.incorrectInstructions[4]);
                    // }
                    // else if (Math.round(exeConfig.maxAngle + 0.5) < 160.0 && exeConfig.maxAngle > 150.0) {
                    //     // exeConfig.incorrectInstructions[5] = incorrectVoiceInstructions[5];
                    //     // console.log(exeConfig.incorrectInstructions[5]);
                    // }
                    // else if (exeConfig.startTime > 0 && exeConfig.counter > 0) {
                    //     const period = Date.now() - exeConfig.startTime;
                    //     if (period > 2000 && period < 2500) {
                    //         // exeConfig.incorrectInstructions[6] = incorrectVoiceInstructions[6];
                    //         // console.log(exeConfig.incorrectInstructions[6] + ":" + period);
                    //     }
                    //     else if (period > 15000) {
                    //         // exeConfig.incorrectInstructions[7] = incorrectVoiceInstructions[7];
                    //         // console.log(exeConfig.incorrectInstructions[7]);
                    //     }
                    // }
                    // else if (exeConfig.minHipAngle < 45) {
                    //     // exeConfig.incorrectInstructions[8] = incorrectVoiceInstructions[8];
                    //     // console.log(exeConfig.incorrectInstructions[8]);
                    // }
                    // else if (exeConfig.maxAngle - exeConfig.minAngle > 110) {
                    //     // exeConfig.incorrectInstructions[1] = correctVoiceInstructions[1];
                    //     // console.log(exeConfig.correctInstructions[1]);
                    // }
                    // else if (exeConfig.minAngle < 55.0) {
                    //     // exeConfig.incorrectInstructions[2] = correctVoiceInstructions[2];
                    //     // console.log(exeConfig.correctInstructions[2]);
                    // }
                    // else {
                    //     //exeConfig.incorrectInstructions[0] = correctVoiceInstructions[0];
                    // }
                    resetMinMax(exeConfig);
                    exeConfig.startTime = Date.now();
                }
            }
        }
    }
    try {
        if (exeConfig) {
            exeConfig.angle = theAngle;
        }
    } catch (error) {
        console.error(error);
    }
}

function pulltopAssistance(angles) {
    onFrameFunc = onFrame;
    const theAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightElbow.toFixed(1))) : Math.floor(parseFloat(angles.leftElbow.toFixed(1)));
    const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));


    if (theAngle < 0 || theHipAngle < 0) {
        return;
    }
    if (!exeConfig) {
        exeConfig = getNewExeConfig(theAngle, theHipAngle);
        minAngle = 45;
        downAmplitude = 15;
        maxAngle = 180;
        upAmplitude = 15;
        directionCounter = 10;
        invalidRange = [75, 150];
        if (!isRecording && camera.g) {
            onGotRecordingStream(camera.g);
        }
        updateStatus('Seeking for direction...');
    }
    exeConfig.maxAngle = Math.max(exeConfig.maxAngle, theAngle);
    exeConfig.minAngle = Math.min(exeConfig.minAngle, theAngle);
    exeConfig.maxHipAngle = Math.max(exeConfig.maxHipAngle, theHipAngle);
    exeConfig.minHipAngle = Math.min(exeConfig.minHipAngle, theHipAngle);

    let direction = exeConfig.direction == 0 ? 'none' : (exeConfig.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${exeConfig.angle}, minAngle: ${exeConfig.minAngle}, maxAngle: ${exeConfig.maxAngle}, moveCounter: ${exeConfig.moveCounter}, dirCount: ${exeConfig.dirCount}, kneeAngle: ${angles.leftKnee.toFixed(1)}, counter: ${exeConfig.counter}, startTime: ${exeConfig.startTime}`);

    if (exeConfig.angle < theAngle) //up
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount--;

        if (exeConfig.dirCount < -5) {
            exeConfig.dirCount = 0;

            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_UP;
                resetMinMax(exeConfig);
                updateStatus(`Direction: up. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_UP) {//Changed direction
                if (exeConfig.minAngle > 95.0) {
                    console.log("notice: exeConfig.minAngle > 95.0");

                    if (isStarted) {
                        stopButtonClick();
                        playVoice("Exercise is completed!");
                    }
                    else {
                        opsFalseExeDetection(exeConfig.counter);
                        exeConfig = null;
                        resetRecordings();
                    }
                }
                else if (angles.leftKnee.toFixed(1) < 90.0) {
                    exeConfig.direction = EXCERCISE_DIRECTION_UP;
                    exeConfig.counter++;
                    if (exeConfig.counter == 2) {
                        //playVoice("Exercise is started!");
                    }
                    isStarted = exeConfig.counter > 1;
                    updateStatus(`Direction: up. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);

                    if (exeConfig.minAngle > minAngle + downAmplitude) {
                        exeConfig.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(exeConfig.incorrectInstructions[0]);
                    }
                    else if (exeConfig.minAngle < minAngle) {
                        exeConfig.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(exeConfig.incorrectInstructions[1]);
                    }

                    let notice = "" + (exeConfig.counter);
                    playVoice(notice);
                    console.log(notice + ":" + exeConfig.angle);

                    resetMinMax(exeConfig);
                }
            }
        }
    }
    else if (exeConfig.angle > theAngle) //down
    {
        exeConfig.angle = theAngle;
        exeConfig.dirCount++;

        if (exeConfig.dirCount > 5) {
            exeConfig.dirCount = 0;

            if (exeConfig.direction == EXCERCISE_DIRECTION_NONE) {
                exeConfig.direction = EXCERCISE_DIRECTION_DOWN;
                resetMinMax(exeConfig);
                exeConfig.startTime = Date.now();
                updateStatus(`Direction: down. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);
            }
            else if (exeConfig.direction != EXCERCISE_DIRECTION_DOWN)//Change direction
            {
                if ((theAngle < 100 || exeConfig.angle - theAngle > 20) && !isStarted) {
                    opsFalseExeDetection(exeConfig.counter);
                    exeConfig = null;
                    resetRecordings();
                    console.log("notice: theAngle: " + theAngle);
                }
                else {
                    exeConfig.direction = EXCERCISE_DIRECTION_DOWN;
                    updateStatus(`Direction: down. Exercise is started: ${isStarted}, counter: ${exeConfig.counter}`);

                    if (exeConfig.maxAngle > 176.0) {
                        exeConfig.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(exeConfig.incorrectInstructions[2]);
                    }
                    else {
                        exeConfig.correctInstructions[0] = correctVoiceInstructions[0];
                        console.log(exeConfig.correctInstructions[0]);

                    }

                    resetMinMax(exeConfig);
                    exeConfig.startTime = Date.now();
                }
            }
        }
    }

    try {
        if (exeConfig) {
            exeConfig.angle = theAngle;
        }
    } catch (error) {
        console.error(error);
    }

}

function opsFalseExeDetection(counter) {
    if (counter > 0) {
        playVoice("Ops, wrong exercise detection.");
    }

}
// const processVideoFrame = async () => {
//     if (!fileVideoElement.paused && !fileVideoElement.ended) {
//         poses = await pose.send({ image: fileVideoElement });
//         fileVideoElement.requestVideoFrameCallback(processVideoFrame);
//     }
// };

const processVideoFrame = async () => {
    if (!fileVideoElement.paused && !fileVideoElement.ended) {


        canvas.width = window.innerWidth * 0.9;
        canvas.height = canvas.width * fileVideoElement.videoHeight / fileVideoElement.videoWidth;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(fileVideoElement, 0, 0, canvas.width, canvas.height);
        poses = await detector.estimatePoses(canvas);
        // const input = tf.browser.fromPixels(canvas);
        // poses = await net.estimateSinglePose(input, {
        //     flipHorizontal: false,
        //   });
        //console.log(poses);

        onBodyPoseResultOffline(poses);

        //bodyPose.detect(canvas, onBodyPoseResultOffline);
    }
};

const drawSegment = ([ay, ax], [by, bx], color) => {
    context.beginPath();
    context.moveTo(ax, ay);
    context.lineTo(bx, by);
    context.lineWidth = 2;
    context.strokeStyle = color;
    context.stroke();
};

function _draw(keypoints) {
    if (keypoints != null) {
        this.drawKeypoints(keypoints);
        this.drawSkeleton(keypoints);
    }
    // const adjacentKeyPoints = posenet.getAdjacentKeyPoints(landmarks, 0.5);
    //   adjacentKeyPoints.forEach(([from, to]) => {
    //     drawSegment([from.y, from.x], [to.y, to.x], 'aqua');
    //   });
    // context.strokeStyle = "blue";
    // context.lineWidth = 3;

    // // Draw the skeleton connections
    // context.strokeStyle = "blue";
    // context.lineWidth = 3;

    // blazePoseConnections.forEach(([start, end]) => {
    //     const startPoint = landmarks[start];
    //     const endPoint = landmarks[end];

    //     if (startPoint.visibility > 0.5 && endPoint.visibility > 0.5) {
    //         context.beginPath();
    //         context.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
    //         context.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
    //         context.stroke();
    //     }
    //});

    // Draw all the tracked landmark points
    // for (let i = 0; i < poses.length; i++) {
    //     let pose = poses[i];
    //     for (let j = 0; j < pose.keypoints.length; j++) {
    //         let keypoint = pose.keypoints[j];
    //         // Only draw a circle if the keypoint's confidence is bigger than 0.1
    //         context.beginPath();
    //         context.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
    //         context.fillStyle = "red";
    //         context.fill();
    //         context.stroke();
    //     }
    // }
}

function drawKeypoints(keypoints) {
    const keypointInd =
        poseDetection.util.getKeypointIndexBySide(poseDetection.SupportedModels.MoveNet);
    context.fillStyle = 'White';
    context.strokeStyle = 'White';
    context.lineWidth = 2;

    for (const i of keypointInd.middle) {
        this.drawKeypoint(keypoints[i]);
    }

    context.fillStyle = 'Green';
    for (const i of keypointInd.left) {
        this.drawKeypoint(keypoints[i]);
    }

    context.fillStyle = 'Orange';
    for (const i of keypointInd.right) {
        this.drawKeypoint(keypoints[i]);
    }
}

function drawKeypoint(keypoint) {
    // If score is null, just show the keypoint.
    const score = keypoint.score != null ? keypoint.score : 1;
    const scoreThreshold = 0.3;

    if (score >= scoreThreshold) {
        const circle = new Path2D();
        circle.arc(keypoint.x, keypoint.y, 2, 0, 2 * Math.PI);
        context.fill(circle);
        context.stroke(circle);
    }
}

/**
 * Draw the skeleton of a body on the video.
 * @param keypoints A list of keypoints.
 */
function drawSkeleton(keypoints) {
    context.fillStyle = 'White';
    context.strokeStyle = 'White';
    context.lineWidth = 2;

    poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet).forEach(([
        i, j
    ]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];

        // If score is null, just show the keypoint.
        const score1 = kp1.score != null ? kp1.score : 1;
        const score2 = kp2.score != null ? kp2.score : 1;
        const scoreThreshold = 0.3;

        if (score1 >= scoreThreshold && score2 >= scoreThreshold) {
            context.beginPath();
            context.moveTo(kp1.x, kp1.y);
            context.lineTo(kp2.x, kp2.y);
            context.stroke();
        }
    });
}

onBodyPoseResult = (result) => {
    //poses = result;
    //_draw(poses);
    updateAnglesDisplay(result.keypoints);
}

onBodyPoseResultOffline = (poses) => {
    if (poses && poses.length > 0) {
        onBodyPoseResult(poses[0]);
        _draw(poses[0].keypoints);
    }

    fileVideoElement.requestVideoFrameCallback(processVideoFrame);
}

let recorder = null;
let blobArray = null;
let isRecording = false;
const VIDEO_RECORDING_TIME_SLICE = 35000;//10 * 60 * 1000;

function onGotRecordingStream(videoStream) {
    fileVideoElement.onplay = null;
    fileVideoElement.onpause = null;
    recorder = new MediaRecorder(videoStream);
    recorder.ondataavailable = onRecordingDataAvailable;
    recorder.stream = videoStream;

    blobArray = { size: 0, blobs: [] };
    isRecording = true;
    recorder.start(VIDEO_RECORDING_TIME_SLICE);
}

function onRecordingDataAvailable(event) {
    if (event) {
        let blob = null;
        if (event.data && event.data.size > 0) {
            blob = event.data;
        }
        else {
            return;
        }
        if (!blobArray) {
            blobArray = { size: 0, blobs: [] };
        }
        blobArray.size += blob.size;
        blobArray.blobs.push(blob);
    }

    if (!isRecording) {
        saveRecording();

        if (recorder && recorder.stream && !isRecording) {
            recorder.ondataavailable = null;
            recorder.stop();
            recorder.stream = null;
            recorder = null;
        }
    }
}

function resetRecordings() {
    blobArray = null;
}

function saveRecording() {
    if (blobArray && blobArray.size > 0 && exeConfig && exeConfig.counter > 0) {
        let seekableBlob = new Blob(blobArray.blobs, { type: "video/webm" });
        var url = URL.createObjectURL(seekableBlob);
        fileVideoElement.src = url;
    }
    else {
        resetRecordings();
    }

    //let file = new File(blobsTosave, fileName, { type: "video/webm" });            
}


const fileVideoElement = document.getElementById("recordedVideo");
// fileVideoElement.style.display = 'block';
// fileVideoElement.controls = true;
fileVideoElement.volume = 0;

//document.body.appendChild(fileVideoElement);
function fileVideoElementOnPlay() {
    processVideoFrame();
    console.log("Voice command: GO");
    updateStatus("Voice command: GO");
    startExerciseAssistance();
    //recognition.start();
}

function fileVideoElementOnPause() {
    //recognition.stop();
    console.log("Voice command: STOP");
    stopExerciseAssistance();
    compileAndPlayInstructions();
}

uploadVideo.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        fileVideoElement.src = url;
        fileVideoElement.onplay = fileVideoElementOnPlay;
        fileVideoElement.onpause = fileVideoElementOnPause;
    }

});

function playVoice(text) {
    //return;
    const msg = new SpeechSynthesisUtterance(text);
    msg.rate = 0.7
    msg.lang = "en-US";
    window.speechSynthesis.speak(msg);
}