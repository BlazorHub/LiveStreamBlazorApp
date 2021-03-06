﻿window.webcam = {
    oninit: function () {

        var msg = "hello"

        function getmsg() {
            console.log(msg);
        }

        var func = getmsg();

        let start = document.getElementById('btnStart');
        let stop = document.getElementById('btnStop');
        let vidSave = document.getElementById('vidSave');

        let constraintObj = {
            audio: true,
            video: {
                facingMode: "user",
                width: { min: 640, ideal: 960, max: 1920 },
                height: { min: 480, ideal: 540, max: 1080 }
            }
        };


        //handle older browsers that might implement getUserMedia in some way
        if (navigator.mediaDevices === undefined) {
            navigator.mediaDevices = {};
            navigator.mediaDevices.getUserMedia = function (constraintObj) {
                let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
                if (!getUserMedia) {
                    return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
                }
                return new Promise(function (resolve, reject) {
                    getUserMedia.call(navigator, constraintObj, resolve, reject);
                });
            }
        } else {
            navigator.mediaDevices.enumerateDevices()
                .then(devices => {
                    devices.forEach(device => {
                        console.log(device.kind.toUpperCase(), device.label);
                        //, device.deviceId
                    })
                })
                .catch(err => {
                    console.log(err.name, err.message);
                })
        }

        navigator.mediaDevices.getUserMedia(constraintObj)
            .then(function (mediaStreamObj) {
                //connect the media stream to the first video element
                let video = document.getElementById('vidInput');
                if ("srcObject" in video) {
                    video.srcObject = mediaStreamObj;
                } else {
                    //old version
                    video.src = window.URL.createObjectURL(mediaStreamObj);
                }

                video.onloadedmetadata = function (ev) {
                    //show in the video element what is being captured by the webcam
                    video.play();
                };

                //add listeners for saving video/audio

                let mediaRecorder = new MediaRecorder(mediaStreamObj);
                let chunks = [];

                let mediaLiveRecorder;

                start.addEventListener('click', (ev) => {
                    mediaRecorder.start();
                    console.log(mediaRecorder.state);
                    var streaminfo = {
                        "id": "12345",
                        "secure_stream_url": "no link",
                        "stream_url": "rtmp://139.162.24.99/live/test"
                    };

                    console.log(streaminfo);
                    console.log(window.location.protocol)

                    const ws = new WebSocket("ws://localhost:3000/rtmp/rtmp%3A%2F%2F139.162.24.99%2Flive%2Ftest");

                    ws.addEventListener('open', (e) => {
                        console.log('Websocket Open', e);
                        mediaLiveRecorder = new MediaRecorder(mediaStreamObj);

                        mediaLiveRecorder.addEventListener('dataavailable', (e) => {
                            ws.send(e.data);
                            DotNet.invokeMethodAsync('LiveStreamBlazorApp', 'OnLiveStreamDataAvailable').then(e => { console.log(e.data); });
                        });

                        mediaLiveRecorder.onstop = (ev) => {
                            ws.close(1000, "Deliberate disconnection");
                        }

                        mediaLiveRecorder.start(500); //Start recording, and dump data every .5 second

                    });
                });


                stop.addEventListener('click', (ev) => {
                    mediaLiveRecorder.stop();
                    mediaRecorder.stop();
                    console.log(mediaRecorder.state);
                });

                mediaRecorder.ondataavailable = function (ev) {
                    chunks.push(ev.data);
                }
                mediaRecorder.onstop = (ev) => {
                    let blob = new Blob(chunks, { 'type': 'video/mp4;' });
                    DotNet.invokeMethodAsync('LiveStreamBlazorApp', 'RecordedData').then(data => {
                        data.push(blob);
                        console.log("sent");
                    });
                    chunks = [];
                    let videoURL = window.URL.createObjectURL(blob);
                    vidSave.src = videoURL;
                }
            })
            .catch(function (err) {
                console.log(err.name, err.message);
            });

        /*********************************
        getUserMedia returns a Promise
        resolve - returns a MediaStream Object
        reject returns one of the following errors
        AbortError - generic unknown cause
        NotAllowedError (SecurityError) - user rejected permissions
        NotFoundError - missing media track
        NotReadableError - user permissions given but hardware/OS error
        OverconstrainedError - constraint video settings preventing
        TypeError - audio: false, video: false
        *********************************/

    }

}