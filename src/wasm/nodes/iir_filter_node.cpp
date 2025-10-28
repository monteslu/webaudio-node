// IIRFilterNode - Arbitrary IIR (Infinite Impulse Response) filter
// Implements custom filter with user-specified feedforward and feedback coefficients

#include <emscripten.h>
#include <cstring>
#include <cmath>

struct IIRFilterNodeState {
    int sample_rate;
    int channels;

    // Filter coefficients
    float* feedforward;  // b coefficients
    float* feedback;     // a coefficients
    int feedforward_length;
    int feedback_length;

    // State buffers per channel (x and y history)
    float** x_history;
    float** y_history;
    int history_index;
};

extern "C" {

EMSCRIPTEN_KEEPALIVE
IIRFilterNodeState* createIIRFilterNode(
    int sample_rate,
    int channels,
    float* feedforward,
    int feedforward_length,
    float* feedback,
    int feedback_length
) {
    IIRFilterNodeState* state = new IIRFilterNodeState();
    state->sample_rate = sample_rate;
    state->channels = channels;

    state->feedforward_length = feedforward_length;
    state->feedback_length = feedback_length;

    // Allocate and copy coefficients
    state->feedforward = new float[feedforward_length];
    state->feedback = new float[feedback_length];
    memcpy(state->feedforward, feedforward, feedforward_length * sizeof(float));
    memcpy(state->feedback, feedback, feedback_length * sizeof(float));

    // Normalize by a[0]
    float a0 = state->feedback[0];
    if (fabsf(a0) < 1e-6f) a0 = 1.0f;

    for (int i = 0; i < feedforward_length; i++) {
        state->feedforward[i] /= a0;
    }
    for (int i = 0; i < feedback_length; i++) {
        state->feedback[i] /= a0;
    }

    // Allocate history buffers
    int max_history = (feedforward_length > feedback_length) ?
                      feedforward_length : feedback_length;

    state->x_history = new float*[channels];
    state->y_history = new float*[channels];
    for (int ch = 0; ch < channels; ch++) {
        state->x_history[ch] = new float[max_history]();
        state->y_history[ch] = new float[max_history]();
    }

    state->history_index = 0;

    return state;
}

EMSCRIPTEN_KEEPALIVE
void destroyIIRFilterNode(IIRFilterNodeState* state) {
    if (!state) return;

    delete[] state->feedforward;
    delete[] state->feedback;

    if (state->x_history) {
        for (int ch = 0; ch < state->channels; ch++) {
            delete[] state->x_history[ch];
            delete[] state->y_history[ch];
        }
        delete[] state->x_history;
        delete[] state->y_history;
    }

    delete state;
}

EMSCRIPTEN_KEEPALIVE
void processIIRFilterNode(
    IIRFilterNodeState* state,
    float* input,
    float* output,
    int frame_count,
    bool has_input
) {
    if (!state || !has_input) {
        memset(output, 0, frame_count * state->channels * sizeof(float));
        return;
    }

    const float* b = state->feedforward;
    const float* a = state->feedback;
    const int b_len = state->feedforward_length;
    const int a_len = state->feedback_length;

    for (int i = 0; i < frame_count; i++) {
        for (int ch = 0; ch < state->channels; ch++) {
            const int idx = i * state->channels + ch;
            float x = input[idx];

            // Compute output using Direct Form II Transposed structure
            // y[n] = b[0]*x[n] + b[1]*x[n-1] + ... + b[M]*x[n-M]
            //                  - a[1]*y[n-1] - ... - a[N]*y[n-N]

            float y = 0.0f;

            // Feedforward (b coefficients with x history)
            y += b[0] * x;
            for (int j = 1; j < b_len; j++) {
                int hist_idx = (state->history_index - j + 1);
                if (hist_idx < 0) hist_idx += b_len;
                y += b[j] * state->x_history[ch][hist_idx];
            }

            // Feedback (a coefficients with y history, skip a[0] as it's normalized to 1)
            for (int j = 1; j < a_len; j++) {
                int hist_idx = (state->history_index - j + 1);
                if (hist_idx < 0) hist_idx += a_len;
                y -= a[j] * state->y_history[ch][hist_idx];
            }

            // Update history
            state->x_history[ch][state->history_index] = x;
            state->y_history[ch][state->history_index] = y;

            output[idx] = y;
        }

        // Update circular buffer index
        state->history_index++;
        int max_len = (b_len > a_len) ? b_len : a_len;
        if (state->history_index >= max_len) {
            state->history_index = 0;
        }
    }
}

EMSCRIPTEN_KEEPALIVE
void getIIRFilterFrequencyResponse(
    IIRFilterNodeState* state,
    float* frequency_hz,
    float* mag_response,
    float* phase_response,
    int array_length
) {
    if (!state || !frequency_hz || !mag_response || !phase_response) return;

    const float* b = state->feedforward;
    const float* a = state->feedback;
    const int b_len = state->feedforward_length;
    const int a_len = state->feedback_length;

    for (int i = 0; i < array_length; i++) {
        float omega = 2.0f * M_PI * frequency_hz[i] / state->sample_rate;

        // Compute H(e^jω) = B(e^jω) / A(e^jω)
        // where B and A are evaluated using Euler's formula

        float b_real = 0.0f, b_imag = 0.0f;
        float a_real = 0.0f, a_imag = 0.0f;

        // Evaluate numerator (feedforward)
        for (int j = 0; j < b_len; j++) {
            float angle = -omega * j;
            b_real += b[j] * cosf(angle);
            b_imag += b[j] * sinf(angle);
        }

        // Evaluate denominator (feedback)
        for (int j = 0; j < a_len; j++) {
            float angle = -omega * j;
            a_real += a[j] * cosf(angle);
            a_imag += a[j] * sinf(angle);
        }

        // Complex division: H = B / A
        float denominator = a_real * a_real + a_imag * a_imag;
        if (denominator < 1e-10f) denominator = 1e-10f;

        float h_real = (b_real * a_real + b_imag * a_imag) / denominator;
        float h_imag = (b_imag * a_real - b_real * a_imag) / denominator;

        // Magnitude
        mag_response[i] = sqrtf(h_real * h_real + h_imag * h_imag);

        // Phase
        phase_response[i] = atan2f(h_imag, h_real);
    }
}

} // extern "C"
