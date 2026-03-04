#include <napi.h>

typedef struct TSLanguage TSLanguage;

extern "C" const TSLanguage *tree_sitter_COBOL();

// "tree-sitter", "language" hashed with BLAKE2 (same as tree-sitter 0.21)
const napi_type_tag LANGUAGE_TYPE_TAG = {
  0x8AF2E5212AD58ABF, 0xD5006CAD83ABBA16
};

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports["name"] = Napi::String::New(env, "cobol");
    // N-API External::New expects void*; grammar exposes const TSLanguage*
    auto language = Napi::External<TSLanguage>::New(env, const_cast<TSLanguage*>(tree_sitter_COBOL()));
    language.TypeTag(&LANGUAGE_TYPE_TAG);
    exports["language"] = language;
    return exports;
}

NODE_API_MODULE(tree_sitter_COBOL_binding, Init)
