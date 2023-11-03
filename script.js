import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import axios from "axios";
import prettyBytes from "pretty-bytes";
import { editor } from "monaco-editor";

require.config({ paths: { vs: '../node_modules/monaco-editor/min/vs' } });

require(['vs/editor/editor.main'], function () {
    window.editor = monaco.editor.create(document.getElementById('json_input'), {
        value: '{\n}',
        language: 'JSON'
    });
});

const form = document.querySelector("[data-form]");
const queryParamsContainer = document.querySelector("[data-query-params]");
const requestHeadersContainer = document.querySelector(
    "[data-request-headers]"
);
const KeyValueTemplate = document.querySelector("[data-key-value-template]");
const responseHeadersContainer = document.querySelector(
    "[data-response-headers]"
);
const responseDataContainer = document.querySelector("[data-response-body]")

document
    .querySelector("[data-add-query-params-btn]")
    .addEventListener("click", () => {
        queryParamsContainer.append(createKeyPairValue());
    });
document
    .querySelector("[data-add-header-btn]")
    .addEventListener("click", () => {
        requestHeadersContainer.append(createKeyPairValue());
    });

queryParamsContainer.append(createKeyPairValue(queryParamsContainer));
requestHeadersContainer.append(createKeyPairValue(requestHeadersContainer));

axios.interceptors.request.use((request) => {
    request.customdata = request.customdata || {};
    request.customdata.startTime = new Date().getTime();
    return request;
});

function updateEndTime(response) {
    response.customdata = response.customdata || {};
    response.customdata.time =
        new Date().getTime() - response.config.customdata.startTime;
    return response;
}

axios.interceptors.response.use(updateEndTime, (e) => {
    return Promise.reject(updateEndTime(e.response));
});

form.addEventListener("submit", (e) => {
    e.preventDefault();
    console.log(window.editor.getValue())
    axios({
        url: document.querySelector("[data-url]").value,
        method: document.querySelector("[data-method]").value,
        params: KeyValuePairsToObjects(queryParamsContainer),
        headers: KeyValuePairsToObjects(requestHeadersContainer),
        // data: JSON.parse(document.querySelector("#json_input").value)
        data: JSON.parse(window.editor.getValue())
    })
        .catch((e) => e)
        .then((response) => {
            document
                .querySelector("[data-response-section]")
                .classList.remove("d-none");
            updateResponseDetails(response);
            updateResponseData(response.data)
            updateResponseHeaders(response.headers);
        });
});

function updateResponseDetails(response) {
    document.querySelector("[data-status]").textContent = response.status;
    document.querySelector("[data-time]").textContent = response.customdata.time;
    document.querySelector("[data-size]").textContent = prettyBytes(
        // the default standard is UTF8 where one character represented by one byte
        JSON.stringify(response.data).length +
        JSON.stringify(response.headers).length
    );
}

function updateResponseHeaders(headers) {
    responseHeadersContainer.innerHTML = "";
    Object.entries(headers).forEach(([key, value]) => {
        const KeyElement = document.createElement("div");
        KeyElement.append(key);
        responseHeadersContainer.append(KeyElement);
        const valueElement = document.createElement("div");
        valueElement.append(value);
        responseHeadersContainer.append(valueElement);
    });
}

function createKeyPairValue() {
    const element = KeyValueTemplate.content.cloneNode(true);
    element.querySelector("[data-remove-btn]").addEventListener("click", (e) => {
        e.target.closest("[data-key-value-pair]").remove();
    });
    return element;
}

function KeyValuePairsToObjects(container) {
    const pairs = container.querySelectorAll("[data-key-value-pair]");
    return [...pairs].reduce((data, pair) => {
        const key = pair.querySelector("[data-key]").value;
        const value = pair.querySelector("[data-value]").value;

        if (key === "") return data;
        return { ...data, [key]: value };
    }, {});
}

const updateResponseData = (data) => {
    responseDataContainer.innerHTML = "";
    const valueElement = document.createElement("pre");
    valueElement.append(JSON.stringify(data, null, 2));
    responseDataContainer.append(valueElement);
}

