import {Config} from "./config.js";

const fetchJson = async (callback) => {
    const response = await callback;
    if (!response.ok) {
        return response.json()
            .then((json) => {
                throw(json);
            });

    }

    return await response.json();
};

export const getPicture = (id) =>
    fetchJson(
        fetch(`${Config.SERVER_URL}pictures/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
    );

export const getLevel = (id) =>
    fetchJson(
        fetch(`${Config.SERVER_URL}levels/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
    );

export const postVideo = (formData) =>
    fetchJson(
        fetch(`${Config.SERVER_URL}videos`, {
            method: "POST",
            body: formData,
        })
    );

export const getVideo = (id) =>
    fetchJson(
        fetch(`${Config.SERVER_URL}videos/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
    );

export const getUserMe = () =>
    fetchJson(
        fetch(`${Config.SERVER_URL}user/me`, {
            method: "GET",
        })
    );

export const getLevels = () =>
    fetchJson(
        fetch(`${Config.SERVER_URL}levels`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
    );

export const setRoomAttr = (id, level, n) =>
    fetchJson(
        fetch(`${Config.SERVER_URL}room`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({id: id, level: level, n: n}),
        })
    );

export const getRoom = (id) =>
    fetchJson(
        fetch(`${Config.SERVER_URL}join/${id}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
    );