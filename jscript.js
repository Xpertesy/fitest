(function () {
    (params = {}), (r = /([^&=]+)=?([^&]*)/g);

    function d(s) {
        return decodeURIComponent(s.replace(/\+/g, " "));
    }
    var match,
        search = location.search;
    while ((match = r.exec(search.substring(1))))
        params[d(match[1])] = d(match[2]);
})();

// Video capturing setup
const videoElement = document.getElementById("hidenVideo");

const canvas = document.getElementById('fitnessCanvas');
const button = document.getElementById('startStopButton');
const buttonInstructions = document.getElementById('playInstructions');
const anglesDisplay = document.getElementById('anglesDisplay');
const context = canvas.getContext('2d');
const exerciseSelector = document.getElementById('exerciseSelector');
const title = document.getElementById('maintitle');
let exerciseCounting = null;
let exerciseAssistance = noEx;
const CAMERA_VIEW_SIDE = params['side'];
const CAMERA_VIEW_SIDE_LEFT = 0;
const CAMERA_VIEW_SIDE_RIGHT = 1;

let bodyPose = ml5.bodyPose("BlazePose");

const connections = bodyPose.getSkeleton();
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
    [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
    [11, 23], [12, 24], [23, 25], [24, 26], [25, 27],
    [26, 28], [27, 29], [28, 30]
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
// // Start Mediapipe Camera
const camera = new Camera(videoElement, {
    onFrame: async () => {
        canvas.width = window.innerWidth * 0.9;
        canvas.height = canvas.width * videoElement.videoHeight / videoElement.videoWidth;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        bodyPose.detect(canvas, onBodyPoseResult);
        //await pose.send({ image: videoElement });
    },
    //width: 1280,
    //height: 720
});

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
    // Right side angles
    angles.rightElbow = calculateAngle(landmarks.right_shoulder, landmarks.right_elbow, landmarks.right_wrist);
    angles.rightShoulder = calculateAngle(landmarks.right_hip, landmarks.right_shoulder, landmarks.right_elbow);
    angles.rightHip = calculateAngle(landmarks.right_knee, landmarks.right_hip, landmarks.right_shoulder);
    angles.rightKnee = calculateAngle(landmarks.right_ankle, landmarks.right_knee, landmarks.right_hip);

    // Left side angles
    angles.rightElbow = calculateAngle(landmarks.left_shoulder, landmarks.left_elbow, landmarks.left_wrist);
    angles.leftShoulder = calculateAngle(landmarks.left_hip, landmarks.left_shoulder, landmarks.left_elbow);
    angles.leftHip = calculateAngle(landmarks.left_knee, landmarks.left_hip, landmarks.left_shoulder);
    angles.leftKnee = calculateAngle(landmarks.left_ankle, landmarks.left_knee, landmarks.left_hip);

    anglesDisplay.textContent = `
        Right Hip: ${angles.rightHip.toFixed(1)}°, 
        Right Knee: ${angles.rightKnee.toFixed(1)}°, 
    `;

    exerciseAssistance(angles);
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
    if (squatsEx) {
        compileAndPlayInstructions();
        fileVideoElement.play();
    }
}

function startStopButtonClick() {
    isRunning = !isRunning;
    button.textContent = isRunning ? 'Stop' : 'Start';
    if (isRunning) {
        camera.start();
        startExerciseAssistance();
        console.log('Pose detection started');
    } else {
        isRecording = false;
        camera.stop();
        stopExerciseAssistance();
        console.log('Pose detection stopped');
    }
}

function startExerciseAssistance() {
    isStarted = false;
    squatsEx = null;

    exerciseAssistance = exeAssistent[EXE_TYPE];// squatsAssistance;
}

function stopExerciseAssistance() {
    exerciseAssistance = noEx;
    //squatsEx = null;
}

function compileAndPlayInstructions() {
    let notice = "";
    if (Object.keys(squatsEx.incorrectInstructions).length > 0) {
        Object.keys(squatsEx.incorrectInstructions).forEach(key => {
            //notice = notice + squatsEx.incorrectInstructions[key];
            playVoice(squatsEx.incorrectInstructions[key]);
        });
    }
    else {
        Object.keys(squatsEx.correctInstructions).forEach(key => {
            //notice = notice + squatsEx.correctInstructions[key];
            playVoice(squatsEx.correctInstructions[key]);
        });
    }

    //playVoice(notice);
}
function noEx(angles) { }

const EXE_TYPE = params['type'];

const exeAssistent = {
    'squats': squatsAssistance,
    'legspush': legspushAssistance,
    'pullhorisontal': pullhorisontalAssistance,
    'pulltop': pulltopAssistance
};

const titles = {
    'squats': 'Squats',
    'legspush': 'Legs Push',
    'pullhorisontal': 'Horisontal Pull',
    'pulltop': 'Pull Top'
};

title.textContent = titles[EXE_TYPE];




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
    "Don't rush! Мovе more slowly!", //5
    "You can move faster!" //6
];

let pulltopIncorrectVoiceInstructions = [
    "Pull lower, try harder!",//0
    "Don't pull too low. Pull the handle as far as your nose.",//1
    "Don't straighten your arms all the way, keep the tension.", //2
];

const correctVoiceInstructionsSet = {
    'squats': squatsCorrectVoiceInstructions,
    'legspush': legspushCorrectVoiceInstructions,
    'pullhorisontal': pullhorisontalCorrectVoiceInstructions,
    'pulltop': pulltopCorrectVoiceInstructions
};

const incorrectVoiceInstructionsSet = {
    'squats': squatsIncorrectVoiceInstructions,
    'legspush': legspushIncorrectVoiceInstructions,
    'pullhorisontal': pullhorisontalIncorrectVoiceInstructions,
    'pulltop': pulltopIncorrectVoiceInstructions
}

const correctVoiceInstructions = correctVoiceInstructionsSet[EXE_TYPE];
const incorrectVoiceInstructions = incorrectVoiceInstructionsSet[EXE_TYPE];

let squatsEx = null;
const EXCERCISE_DIRECTION_UP = -1;
const EXCERCISE_DIRECTION_DOWN = 1;
const EXCERCISE_DIRECTION_NONE = 0;

let minAngle = 45;
let downAmplitude = 30;
let maxAngle = 180;
let upAmplitude = 30;
let directionCounter = 10;
let invalidRange = [75, 150];

let isStarted = false;

function squatsAssistance(angles) {

    const theAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightKnee.toFixed(1))) : Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    // const theAngle = Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    // const theHipAngle = Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    if (theAngle < 0 || theHipAngle < 0) {
        return;
    }
    if (!squatsEx) {
        squatsEx = {
            counter: 0,
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
        }
        minAngle = 45;
        downAmplitude = 30;
        maxAngle = 180;
        upAmplitude = 30;
        directionCounter = 10;
        invalidRange = [75, 150];
        if (!isRecording && camera.g) {
            onGotRecordingStream(camera.g);
        }
    }
    squatsEx.maxAngle = Math.max(squatsEx.maxAngle, theAngle);
    squatsEx.minAngle = Math.min(squatsEx.minAngle, theAngle);
    squatsEx.maxHipAngle = Math.max(squatsEx.maxHipAngle, theHipAngle);
    squatsEx.minHipAngle = Math.min(squatsEx.minHipAngle, theHipAngle);

    let direction = squatsEx.direction == 0 ? 'none' : (squatsEx.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${squatsEx.angle}, minAngle: ${squatsEx.minAngle}, maxAngle: ${squatsEx.maxAngle}, dirCount: ${squatsEx.dirCount}, counter: ${squatsEx.counter}, startTime: ${squatsEx.startTime}`);
    if (squatsEx.angle < theAngle) //up
    {
        squatsEx.angle = theAngle;
        squatsEx.dirCount--;

        if (squatsEx.dirCount < - directionCounter) {
            squatsEx.dirCount = 0;
            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_UP;
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_UP) {//Changed direction from down to up
                if (squatsEx.minAngle > 95.0) {
                    console.log("notice: squatsEx.minAngle > 95.0");

                    if (isStarted) {
                        startStopButtonClick();
                    }
                    else {
                        squatsEx = null;
                        resetRecordings();
                    }
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_UP;
                    squatsEx.counter++;
                    isStarted = squatsEx.counter > 1;
                    if (squatsEx.minAngle > minAngle + downAmplitude) {
                        squatsEx.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(squatsEx.incorrectInstructions[0]);
                    }
                    else if (squatsEx.minAngle < minAngle) {
                        squatsEx.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(squatsEx.incorrectInstructions[1]);
                    }
                    else if (squatsEx.minHipAngle < 45.0) {
                        squatsEx.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(squatsEx.incorrectInstructions[2]);
                    }
                    else if (squatsEx.minHipAngle > 75.0) {
                        squatsEx.incorrectInstructions[3] = incorrectVoiceInstructions[3];
                        console.log(squatsEx.incorrectInstructions[3]);
                    }
                    let notice = "" + (squatsEx.counter);
                    playVoice(notice);
                    console.log(notice + ":" + squatsEx.angle);

                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                }
            }
        }
    }
    else if (squatsEx.angle > theAngle) //down
    {
        squatsEx.angle = theAngle;
        squatsEx.dirCount++;

        if (squatsEx.dirCount > directionCounter) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_DOWN;
                squatsEx.startTime = Date.now();
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_DOWN)//Change direction from up to down
            {
                if (theAngle < 100 && !isStarted) {
                    squatsEx = null;
                    resetRecordings();
                    console.log("notice: theAngle < 100");
                }
                else if (squatsEx.angle - theAngle > 20 && !isStarted) {
                    squatsEx = null;
                    resetRecordings();
                    console.log("notice: squatsEx.angle - theAngle > 20");
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_DOWN;
                    if (squatsEx.maxAngle > 176.0) {
                        squatsEx.incorrectInstructions[4] = incorrectVoiceInstructions[4];
                        console.log(squatsEx.incorrectInstructions[4]);
                    }
                    else if (Math.round(squatsEx.maxAngle + 0.5) < 170.0 && squatsEx.maxAngle > 160.0) {
                        squatsEx.incorrectInstructions[5] = incorrectVoiceInstructions[5];
                        console.log(squatsEx.incorrectInstructions[5]);
                    }
                    else if (squatsEx.startTime > 0 && squatsEx.counter > 0) {
                        const period = Date.now() - squatsEx.startTime;
                        if (period > 2000 && period < 3000) {
                            squatsEx.incorrectInstructions[6] = incorrectVoiceInstructions[6];
                            console.log(squatsEx.incorrectInstructions[6]);
                        }
                        else if (period > 15000) {
                            squatsEx.incorrectInstructions[7] = incorrectVoiceInstructions[7];
                            console.log(squatsEx.incorrectInstructions[7]);
                        }
                    }
                    else if (squatsEx.minHipAngle < 45) {
                        squatsEx.incorrectInstructions[8] = incorrectVoiceInstructions[8];
                        console.log(squatsEx.incorrectInstructions[8]);
                    }
                    else if (squatsEx.maxAngle - squatsEx.minAngle > 110) {
                        squatsEx.incorrectInstructions[1] = correctVoiceInstructions[1];
                        console.log(squatsEx.correctInstructions[1]);
                    }
                    else if (squatsEx.minAngle < 55.0) {
                        squatsEx.incorrectInstructions[2] = correctVoiceInstructions[2];
                        console.log(squatsEx.correctInstructions[2]);
                    }
                    else {
                        squatsEx.incorrectInstructions[0] = correctVoiceInstructions[0];
                    }
                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                    squatsEx.startTime = Date.now();
                }
            }
        }
    }
    try {
        if (squatsEx) {
            squatsEx.angle = theAngle;
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
    if (!squatsEx) {
        squatsEx = {
            counter: 0,
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
        }
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
    squatsEx.maxAngle = Math.max(squatsEx.maxAngle, theAngle);
    squatsEx.minAngle = Math.min(squatsEx.minAngle, theAngle);
    squatsEx.maxHipAngle = Math.max(squatsEx.maxHipAngle, theHipAngle);
    squatsEx.minHipAngle = Math.min(squatsEx.minHipAngle, theHipAngle);

    let direction = squatsEx.direction == 0 ? 'none' : (squatsEx.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${squatsEx.angle}, minAngle: ${squatsEx.minAngle}, maxAngle: ${squatsEx.maxAngle}, dirCount: ${squatsEx.dirCount}, counter: ${squatsEx.counter}, startTime: ${squatsEx.startTime}`);
    if (squatsEx.angle < theAngle) //up
    {
        squatsEx.angle = theAngle;
        squatsEx.dirCount--;

        if (squatsEx.dirCount < - directionCounter) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_UP;
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_UP) {//Changed direction from down to up
                if (squatsEx.minAngle > 135.0) {
                    console.log("notice: squatsEx.minAngle > 135.0");
                    if (isStarted) {
                        startStopButtonClick();
                    }
                    else {
                        squatsEx = null;
                        resetRecordings();
                    }
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_UP;
                    squatsEx.counter++;
                    isStarted = squatsEx.counter > 1;

                    if (squatsEx.minAngle > minAngle + downAmplitude) {
                        squatsEx.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(squatsEx.incorrectInstructions[0]);
                    }
                    else if (squatsEx.minAngle < minAngle) {
                        squatsEx.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(squatsEx.incorrectInstructions[1]);
                    }
                    let notice = "" + (squatsEx.counter);
                    playVoice(notice);
                    console.log(notice + ":" + squatsEx.angle);

                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                }
            }
        }
    }
    else if (squatsEx.angle > theAngle) //down
    {
        squatsEx.angle = theAngle;
        squatsEx.dirCount++;

        if (squatsEx.dirCount > directionCounter) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_DOWN;
                squatsEx.startTime = Date.now();
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_DOWN)//Change direction from up to down
            {
                if (theAngle < 105.0 && !isStarted) {
                    squatsEx = null;
                    resetRecordings();
                    console.log(`notice: theAngle < 105, theAngle:${theAngle}`);
                }
                else if (squatsEx.angle - theAngle > 20 && !isStarted) {
                    squatsEx = null;
                    resetRecordings();
                    console.log("notice: squatsEx.angle - theAngle > 20");
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_DOWN;

                    if (squatsEx.maxAngle > maxAngle) {
                        squatsEx.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(squatsEx.incorrectInstructions[2]);
                    }
                    else if (squatsEx.startTime > 0 && squatsEx.counter > 0) {
                        const period = Date.now() - squatsEx.startTime;
                        if (period > 2000 && period < 3000) {
                            squatsEx.incorrectInstructions[3] = incorrectVoiceInstructions[3];
                            console.log(squatsEx.incorrectInstructions[3]);
                        }
                        else if (period > 15000) {
                            squatsEx.incorrectInstructions[4] = incorrectVoiceInstructions[4];
                            console.log(squatsEx.incorrectInstructions[4]);
                        }
                    }
                    else if (squatsEx.maxAngle - squatsEx.minAngle > 60) {
                        squatsEx.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(squatsEx.correctInstructions[1]);
                    }
                    else if (squatsEx.minAngle < 85.0) {
                        squatsEx.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(squatsEx.correctInstructions[2]);
                    }
                    else {
                        squatsEx.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(squatsEx.correctInstructions[0]);
                    }

                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                    squatsEx.startTime = Date.now();
                }
            }
        }
    }

    try {
        if (squatsEx) {
            squatsEx.angle = theAngle;
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
    if (!squatsEx) {
        squatsEx = {
            counter: 0,
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
        }
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
    squatsEx.maxAngle = Math.max(squatsEx.maxAngle, theAngle);
    squatsEx.minAngle = Math.min(squatsEx.minAngle, theAngle);
    squatsEx.maxHipAngle = Math.max(squatsEx.maxHipAngle, theHipAngle);
    squatsEx.minHipAngle = Math.min(squatsEx.minHipAngle, theHipAngle);

    let direction = squatsEx.direction == 0 ? 'none' : (squatsEx.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${squatsEx.angle}, minAngle: ${squatsEx.minAngle}, maxAngle: ${squatsEx.maxAngle}, dirCount: ${squatsEx.dirCount}, counter: ${squatsEx.counter}, startTime: ${squatsEx.startTime}`);
    if (squatsEx.angle < theAngle) //up
    {
        squatsEx.angle = theAngle;
        squatsEx.dirCount--;

        if (squatsEx.dirCount < - directionCounter) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_UP;
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_UP) {//Changed direction from down to up
                if (squatsEx.minAngle > 95.0) {
                    console.log("notice: squatsEx.minAngle > 95.0");
                    squatsEx = null;

                    if (isStarted) {
                        startStopButtonClick();
                    }
                    else {
                        squatsEx = null;
                        resetRecordings();
                    }
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_UP;
                    squatsEx.counter++;
                    isStarted = squatsEx.counter > 1;

                    if (squatsEx.minAngle > minAngle + downAmplitude) {
                        squatsEx.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(squatsEx.incorrectInstructions[0]);
                    }
                    else if (squatsEx.minAngle < minAngle) {
                        squatsEx.incorrectInstructions[3] = incorrectVoiceInstructions[3];
                        console.log(squatsEx.incorrectInstructions[3]);
                    }
                    else if (squatsEx.minHipAngle < 75.0) {
                        squatsEx.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(squatsEx.incorrectInstructions[1]);
                    }
                    else if (squatsEx.minHipAngle > 95.0) {
                        squatsEx.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(squatsEx.incorrectInstructions[2]);
                    }
                    let notice = "" + (squatsEx.counter);
                    playVoice(notice);
                    console.log(notice + ":" + squatsEx.angle);

                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                }
            }
        }
    }
    else if (squatsEx.angle > theAngle) //down
    {
        squatsEx.angle = theAngle;
        squatsEx.dirCount++;

        if (squatsEx.dirCount > directionCounter) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_DOWN;
                squatsEx.startTime = Date.now();
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_DOWN)//Change direction from up to down
            {
                if (theAngle < 100 && !isStarted) {
                    squatsEx = null;
                    resetRecordings();
                    console.log("notice: theAngle < 100");
                }
                else if (squatsEx.angle - theAngle > 20 && !isStarted) {
                    squatsEx = null;
                    resetRecordings();
                    console.log("notice: squatsEx.angle - theAngle > 20");
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_DOWN;

                    if (squatsEx.maxAngle > 176.0) {
                        squatsEx.incorrectInstructions[4] = incorrectVoiceInstructions[4];
                        console.log(squatsEx.incorrectInstructions[4]);
                    }
                    else if (squatsEx.startTime > 0 && squatsEx.counter > 0) {
                        const period = Date.now() - squatsEx.startTime;
                        if (period > 2000 && period < 3000) {
                            squatsEx.incorrectInstructions[5] = incorrectVoiceInstructions[5];
                            console.log(squatsEx.incorrectInstructions[5]);
                        }
                        else if (period > 15000) {
                            squatsEx.incorrectInstructions[6] = incorrectVoiceInstructions[6];
                            console.log(squatsEx.incorrectInstructions[6]);
                        }
                    }
                    else if (squatsEx.maxAngle - squatsEx.minAngle > 110) {
                        squatsEx.correctInstructions[1] = correctVoiceInstructions[1];
                        console.log(squatsEx.correctInstructions[1]);
                    }
                    else {
                        squatsEx.correctInstructions[0] = correctVoiceInstructions[0];
                        console.log(squatsEx.correctInstructions[0]);
                    }

                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                    squatsEx.startTime = Date.now();
                }
            }
        }
    }

    try {
        if (squatsEx) {
            squatsEx.angle = theAngle;
        }
    } catch (error) {
        console.error(error);
    }

}

function backbridgeAssistance(angles) {

    const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));
    const theAngle = theHipAngle;

    // const theAngle = Math.floor(parseFloat(angles.leftKnee.toFixed(1)));
    // const theHipAngle = Math.floor(parseFloat(angles.leftHip.toFixed(1)));

    if (theAngle < 0 || theHipAngle < 0) {
        return;
    }
    if (!squatsEx) {
        squatsEx = {
            counter: 0,
            angle: theAngle,
            minAngle: theAngle,
            maxAngle: theAngle,
            minHipAngle: theHipAngle,
            maxHipAngle: theHipAngle,
            startTime: Date.now(),
            dirCount: 0,
            test: 0,
            direction: EXCERCISE_DIRECTION_NONE //(0) - none, (1) - down, (-1) - up
        }
        minAngle = 90;
        downAmplitude = 20;
        maxAngle = 180;
        upAmplitude = 20;
        directionCounter = 10;
        invalidRange = [75, 150];
        if (!isRecording && camera.g) {
            onGotRecordingStream(camera.g);
        }
    }
    squatsEx.maxAngle = Math.max(squatsEx.maxAngle, theAngle);
    squatsEx.minAngle = Math.min(squatsEx.minAngle, theAngle);
    squatsEx.maxHipAngle = Math.max(squatsEx.maxHipAngle, theHipAngle);
    squatsEx.minHipAngle = Math.min(squatsEx.minHipAngle, theHipAngle);

    let direction = squatsEx.direction == 0 ? 'none' : (squatsEx.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${squatsEx.angle}, minAngle: ${squatsEx.minAngle}, maxAngle: ${squatsEx.maxAngle}, dirCount: ${squatsEx.dirCount}, counter: ${squatsEx.counter}, startTime: ${squatsEx.startTime}`);
    if (squatsEx.angle < theAngle) //up
    {
        squatsEx.angle = theAngle;
        //squatsEx.minAngle = Math.min(squatsEx.minAngle, theAngle);
        squatsEx.dirCount--;
        //console.log(`theAngle: ${theAngle}, squatsEx.dirCount: ${squatsEx.dirCount}`);

        if (squatsEx.dirCount < - directionCounter) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_UP;
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_UP) {//Changed direction from down to up
                if (squatsEx.minAngle > 165.0) {
                    console.log("notice: squatsEx.minAngle > 120.0");
                    squatsEx = null;
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_UP;
                    squatsEx.counter++;
                    if (squatsEx.minAngle > minAngle + downAmplitude) {
                        let notice = voiceInstructions[3];
                        playVoice(notice);
                        console.log(notice + ":" + squatsEx.minAngle);
                    }
                    else if (squatsEx.minAngle < minAngle) {
                        let notice = voiceInstructions[4];
                        playVoice(notice);
                        console.log(notice + ":" + squatsEx.minAngle);
                    }
                    else if (squatsEx.minHipAngle < 45.0) {
                        let notice = voiceInstructions[5];
                        playVoice(notice);
                        console.log(notice + ":" + squatsEx.minHipAngle);
                    }
                    else if (squatsEx.minHipAngle > 75.0) {
                        let notice = voiceInstructions[6];
                        playVoice(notice);
                        console.log(notice + ":" + squatsEx.minHipAngle);
                    }
                    else {
                        let notice = voiceInstructions[7];
                        playVoice(notice);
                        console.log(notice + ":" + squatsEx.angle);
                    }
                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                    // if (squatsEx.counter > 30) {
                    //     stopExerciseAssistance();
                    // }
                }
            }
        }
    }
    else if (squatsEx.angle > theAngle) //down
    {
        //squatsEx.maxAngle = Math.max(squatsEx.maxAngle, theAngle);
        squatsEx.angle = theAngle;
        squatsEx.dirCount++;
        //console.log(`theAngle: ${theAngle}, squatsEx.dirCount: ${squatsEx.dirCount}`);

        if (squatsEx.dirCount > directionCounter) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_DOWN;
                squatsEx.startTime = Date.now();
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_DOWN)//Change direction from up to down
            {
                if (theAngle < 100) {
                    squatsEx = null;
                    console.log("notice: theAngle < 100");
                }
                else if (squatsEx.angle - theAngle > 20) {
                    squatsEx = null;
                    console.log("notice: squatsEx.angle - theAngle > 20");
                }
                // else if (squatsEx.minAngle - squatsEx.minAngle < 110) 
                // {
                //     squatsEx = null;
                //     console.log("notice: squatsEx.minAngle - squatsEx.minAngle < 110");
                // }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_DOWN;

                    if (squatsEx.maxAngle > 176.0) {
                        let notice = voiceInstructions[8];
                        playVoice(notice);
                        console.log(notice + ":" + squatsEx.maxAngle);
                    }
                    else if (Math.round(squatsEx.maxAngle + 0.5) < 170.0 && squatsEx.maxAngle > 160.0) {
                        let notice = voiceInstructions[9];
                        playVoice(notice);
                        console.log(notice + ":" + squatsEx.maxAngle);
                    }
                    else if (squatsEx.startTime > 0 && squatsEx.counter > 0) {
                        const period = Date.now() - squatsEx.startTime;
                        if (period > 2000 && period < 3000) {
                            let notice = voiceInstructions[10];
                            playVoice(notice);
                            console.log(notice + `: ${squatsEx.maxAngle}, period: ${period}`);
                        }
                        else if (period > 15000) {
                            let notice = voiceInstructions[11];
                            playVoice(notice);
                            console.log(notice + `: ${squatsEx.angle}, period: ${period}`);
                        }
                    }
                    else if (squatsEx.minHipAngle < 45) {
                        let notice = voiceInstructions[12];
                        playVoice(notice);
                        console.log(notice + `: ${squatsEx.minHipAngle}`);
                    }
                    else if (squatsEx.maxAngle - squatsEx.minAngle > 110) {
                        let notice = voiceInstructions[13];
                        playVoice(notice);
                        console.log(notice + `: ${squatsEx.minHipAngle}`);
                    }
                    else if (squatsEx.minAngle < 55.0) {
                        let notice = voiceInstructions[14];
                        playVoice(notice);
                        console.log(notice + `: ${squatsEx.minHipAngle}`);
                    }
                    else {
                        let notice = voiceInstructions[0];
                        playVoice(notice);
                        console.log(notice + `: ${squatsEx.minHipAngle}`);
                    }

                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                    squatsEx.startTime = Date.now();
                    //console.log(`squatsEx.startTime: ${squatsEx.startTime}`);
                }
            }
        }
    }

    try {
        if (squatsEx) {
            squatsEx.angle = theAngle;
        }
    } catch (error) {
        console.error(error);
    }

}

function pulltopAssistance(angles) {
    const theAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightElbow.toFixed(1))) : Math.floor(parseFloat(angles.leftElbow.toFixed(1)));
    const theHipAngle = CAMERA_VIEW_SIDE == CAMERA_VIEW_SIDE_RIGHT ? Math.floor(parseFloat(angles.rightHip.toFixed(1))) : Math.floor(parseFloat(angles.leftHip.toFixed(1)));


    if (theAngle < 0 || theHipAngle < 0) {
        return;
    }
    if (!squatsEx) {
        squatsEx = {
            counter: 0,
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
        }
        minAngle = 65;
        downAmplitude = 15;
        maxAngle = 180;
        upAmplitude = 15;
        directionCounter = 10;
        invalidRange = [75, 150];
        if (!isRecording && camera.g) {
            onGotRecordingStream(camera.g);
        }
    }
    squatsEx.maxAngle = Math.max(squatsEx.maxAngle, theAngle);
    squatsEx.minAngle = Math.min(squatsEx.minAngle, theAngle);
    squatsEx.maxHipAngle = Math.max(squatsEx.maxHipAngle, theHipAngle);
    squatsEx.minHipAngle = Math.min(squatsEx.minHipAngle, theHipAngle);

    let direction = squatsEx.direction == 0 ? 'none' : (squatsEx.direction > 0 ? 'down' : 'up');
    console.log(`theAngle: ${theAngle}, direction: ${direction}, angle: ${squatsEx.angle}, minAngle: ${squatsEx.minAngle}, maxAngle: ${squatsEx.maxAngle}, dirCount: ${squatsEx.dirCount}, counter: ${squatsEx.counter}, startTime: ${squatsEx.startTime}`);
    if (squatsEx.angle < theAngle) //up
    {
        squatsEx.angle = theAngle;
        squatsEx.dirCount--;

        if (squatsEx.dirCount < -5) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_UP;
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_UP) {//Changed direction
                if (squatsEx.minAngle > 95.0) {
                    console.log("notice: squatsEx.minAngle > 95.0");

                    if (isStarted) {
                        startStopButtonClick();
                    }
                    else {
                        squatsEx = null;
                        resetRecordings();
                    }
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_UP;
                    squatsEx.counter++;
                    isStarted = squatsEx.counter > 1;

                    if (squatsEx.minAngle > minAngle + downAmplitude) {
                        squatsEx.incorrectInstructions[0] = incorrectVoiceInstructions[0];
                        console.log(squatsEx.incorrectInstructions[0]);
                    }
                    else if (squatsEx.minAngle < minAngle) {
                        squatsEx.incorrectInstructions[1] = incorrectVoiceInstructions[1];
                        console.log(squatsEx.incorrectInstructions[1]);
                    }

                    let notice = "" + (squatsEx.counter);
                    playVoice(notice);
                    console.log(notice + ":" + squatsEx.angle);

                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                }
            }
        }
    }
    else if (squatsEx.angle > theAngle) //down
    {
        squatsEx.angle = theAngle;
        squatsEx.dirCount++;

        if (squatsEx.dirCount > 5) {
            squatsEx.dirCount = 0;

            if (squatsEx.direction == EXCERCISE_DIRECTION_NONE) {
                squatsEx.direction = EXCERCISE_DIRECTION_DOWN;
                squatsEx.startTime = Date.now();
            }
            else if (squatsEx.direction != EXCERCISE_DIRECTION_DOWN)//Change direction
            {
                if ((theAngle < 100 || squatsEx.angle - theAngle > 20) && !isStarted) {
                    squatsEx = null;
                    resetRecordings();
                    console.log("notice: theAngle: " + theAngle);
                }
                else {
                    squatsEx.direction = EXCERCISE_DIRECTION_DOWN;

                    if (squatsEx.maxAngle > 176.0) {
                        squatsEx.incorrectInstructions[2] = incorrectVoiceInstructions[2];
                        console.log(squatsEx.incorrectInstructions[2]);
                    }
                    else {
                        squatsEx.correctInstructions[0] = correctVoiceInstructions[0];
                        console.log(squatsEx.correctInstructions[0]);

                    }

                    squatsEx.minAngle = 180;
                    squatsEx.maxAngle = 0;
                    squatsEx.minHipAngle = 180;
                    squatsEx.maxHipAngle = 0;
                    squatsEx.startTime = Date.now();
                }
            }
        }
    }

    try {
        if (squatsEx) {
            squatsEx.angle = theAngle;
        }
    } catch (error) {
        console.error(error);
    }

}

const processVideoFrame = async () => {
    if (!fileVideoElement.paused && !fileVideoElement.ended) {
        //await pose.send({ image: fileVideoElement });
        canvas.width = window.innerWidth * 0.9;
        canvas.height = canvas.width * fileVideoElement.videoHeight / fileVideoElement.videoWidth;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(fileVideoElement, 0, 0, canvas.width, canvas.height);
        bodyPose.detect(canvas, onBodyPoseResult);
        fileVideoElement.requestVideoFrameCallback(processVideoFrame);
    }
};

function _draw() {
    context.strokeStyle = "blue";
    context.lineWidth = 3;

    // Draw the skeleton connections
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        for (let j = 0; j < connections.length; j++) {
            let pointAIndex = connections[j][0];
            let pointBIndex = connections[j][1];
            let pointA = pose.keypoints[pointAIndex];
            let pointB = pose.keypoints[pointBIndex];
            context.beginPath();
            context.moveTo(pointA.x, pointA.y);
            context.lineTo(pointB.x, pointB.y);
            context.stroke();
        }
    }

    // Draw all the tracked landmark points
    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i];
        for (let j = 0; j < pose.keypoints.length; j++) {
            let keypoint = pose.keypoints[j];
            // Only draw a circle if the keypoint's confidence is bigger than 0.1
            context.beginPath();
            context.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            context.fillStyle = "red";
            context.fill();
        }
    }
}

onBodyPoseResult = (result) => {
    poses = result;
    _draw();
    updateAnglesDisplay(poses[0]);
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
    if (blobArray && blobArray.size > 0 && squatsEx && squatsEx.counter > 0) {
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
    //msg.lang = "en-US";
    window.speechSynthesis.speak(msg);
}