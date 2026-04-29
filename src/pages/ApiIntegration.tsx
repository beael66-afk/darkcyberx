import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Download, FileJson, Code2, Globe, Shield, Zap, AlertTriangle, Server, BookOpen, Bell, Webhook } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const VALIDATE_V1_URL = `${SUPABASE_URL}/functions/v1/validate-license`;
const VALIDATE_V2_URL = `${SUPABASE_URL}/functions/v1/validate-v2`;

// ── Code examples for all languages ──────────────────────────────────────────

const getCodeExamples = (apiUrl: string) => ({
  csharp: `using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class LicenseValidator
{
    private readonly string _apiUrl = "${apiUrl}";
    private readonly string _apiKey;

    public LicenseValidator(string apiKey)
    {
        _apiKey = apiKey;
    }

    public async Task<LicenseResult> ValidateAsync(string licenseKey, string hwid = null, string deviceName = null, string osInfo = null, string productName = null)
    {
        using var client = new HttpClient();
        client.DefaultRequestHeaders.Add("x-api-key", _apiKey);

        var payload = new
        {
            license_key = licenseKey,
            hwid,
            device_name = deviceName,
            os_info = osInfo,
            product_name = productName  // اسم المنتج للتحقق منه (للتراخيص متعددة المنتجات)
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        try
        {
            var response = await client.PostAsync(_apiUrl, content);
            var body = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<LicenseResult>(body);

            if (result?.force_shutdown == true)
            {
                // ⚠️ يجب إغلاق التطبيق فوراً
                Environment.Exit(1);
            }

            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"License validation error: {ex.Message}");
            return new LicenseResult { valid = false, error = ex.Message };
        }
    }
}

public class LicenseResult
{
    public bool valid { get; set; }
    public string error { get; set; }
    public bool? force_shutdown { get; set; }
    public LicenseInfo license { get; set; }
}

public class AllowedProduct
{
    public string id { get; set; }
    public string name { get; set; }
}

public class LicenseInfo
{
    public string key { get; set; }
    public string status { get; set; }
    public string expire_at { get; set; }
    public int? max_devices { get; set; }
    public int? max_products { get; set; }
    public string customer { get; set; }
    public string product { get; set; }
    public List<AllowedProduct> allowed_products { get; set; }
}

// ── الاستخدام ──
// var validator = new LicenseValidator("YOUR_API_KEY");
// var result = await validator.ValidateAsync("XXXX-XXXX-XXXX-XXXX", hwid: "DEVICE_HWID", productName: "اسم المنتج");
// if (result.valid) { /* ترخيص صالح للمنتج */ }`,

  python: `import requests
import sys

class LicenseValidator:
    def __init__(self, api_key: str):
        self.api_url = "${apiUrl}"
        self.api_key = api_key

    def validate(self, license_key: str, hwid: str = None, device_name: str = None, os_info: str = None, product_name: str = None) -> dict:
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json"
        }

        payload = {"license_key": license_key}
        if hwid:
            payload["hwid"] = hwid
        if device_name:
            payload["device_name"] = device_name
        if os_info:
            payload["os_info"] = os_info
        if product_name:
            payload["product_name"] = product_name  # للتحقق من المنتج للتراخيص متعددة المنتجات

        try:
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=10)
            data = response.json()

            if data.get("force_shutdown"):
                # ⚠️ يجب إغلاق التطبيق فوراً
                sys.exit(1)

            return data
        except Exception as e:
            print(f"License validation error: {e}")
            return {"valid": False, "error": str(e)}

# ── الاستخدام ──
# validator = LicenseValidator("YOUR_API_KEY")
# result = validator.validate("XXXX-XXXX-XXXX-XXXX", hwid="DEVICE_HWID", product_name="اسم المنتج")
# if result.get("valid"):
#     allowed = [p["name"] for p in result["license"].get("allowed_products", [])]
#     print(f"ترخيص صالح! المنتجات المتاحة: {allowed}")`,

  javascript: `class LicenseValidator {
    constructor(apiKey) {
        this.apiUrl = "${apiUrl}";
        this.apiKey = apiKey;
    }

    async validate(licenseKey, hwid = null, deviceName = null, osInfo = null, productName = null) {
        const payload = { license_key: licenseKey };
        if (hwid) payload.hwid = hwid;
        if (deviceName) payload.device_name = deviceName;
        if (osInfo) payload.os_info = osInfo;
        if (productName) payload.product_name = productName; // للتراخيص متعددة المنتجات

        try {
            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "x-api-key": this.apiKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.force_shutdown) {
                // ⚠️ يجب إغلاق التطبيق فوراً
                process.exit(1);
            }

            return data;
        } catch (error) {
            console.error("License validation error:", error);
            return { valid: false, error: error.message };
        }
    }
}

// ── الاستخدام ──
// const validator = new LicenseValidator("YOUR_API_KEY");
// const result = await validator.validate("XXXX-XXXX-XXXX-XXXX", "DEVICE_HWID", null, null, "اسم المنتج");
// if (result.valid) {
//     console.log("المنتجات المسموحة:", result.license.allowed_products?.map(p => p.name));
// }`,

  php: `<?php

class LicenseValidator {
    private string \$apiUrl = "${apiUrl}";
    private string \$apiKey;

    public function __construct(string \$apiKey) {
        \$this->apiKey = \$apiKey;
    }

    public function validate(string \$licenseKey, ?string \$hwid = null, ?string \$deviceName = null, ?string \$osInfo = null, ?string \$productName = null): array {
        \$payload = ["license_key" => \$licenseKey];
        if (\$hwid) \$payload["hwid"] = \$hwid;
        if (\$deviceName) \$payload["device_name"] = \$deviceName;
        if (\$osInfo) \$payload["os_info"] = \$osInfo;
        if (\$productName) \$payload["product_name"] = \$productName; // للتراخيص متعددة المنتجات

        \$options = [
            "http" => [
                "method"  => "POST",
                "header"  => "x-api-key: " . \$this->apiKey . "\\r\\nContent-Type: application/json\\r\\n",
                "content" => json_encode(\$payload),
                "timeout" => 10
            ]
        ];

        try {
            \$context = stream_context_create(\$options);
            \$response = file_get_contents(\$this->apiUrl, false, \$context);
            \$data = json_decode(\$response, true);

            if (!empty(\$data["force_shutdown"])) {
                // ⚠️ يجب إغلاق التطبيق فوراً
                exit(1);
            }

            return \$data;
        } catch (\\Exception \$e) {
            return ["valid" => false, "error" => \$e->getMessage()];
        }
    }
}

// ── الاستخدام ──
// \$validator = new LicenseValidator("YOUR_API_KEY");
// \$result = \$validator->validate("XXXX-XXXX-XXXX-XXXX", "DEVICE_HWID", null, null, "اسم المنتج");
// if (\$result["valid"]) { /* ترخيص صالح للمنتج */ }
?>`,

  delphi: `unit LicenseValidator;

interface

uses
  System.SysUtils, System.Classes, System.Net.HttpClient,
  System.Net.HttpClientComponent, System.JSON;

type
  TLicenseResult = record
    Valid: Boolean;
    Error: string;
    ForceShutdown: Boolean;
    Status: string;
    ExpireAt: string;
    MaxDevices: Integer;
    Customer: string;
    Product: string;
  end;

  TLicenseValidator = class
  private
    FApiUrl: string;
    FApiKey: string;
  public
    constructor Create(const AApiKey: string);
    function Validate(const ALicenseKey: string; const AHwid: string = '';
      const ADeviceName: string = ''; const AOsInfo: string = '';
      const AProductName: string = ''): TLicenseResult;
  end;

implementation

constructor TLicenseValidator.Create(const AApiKey: string);
begin
  FApiUrl := '${apiUrl}';
  FApiKey := AApiKey;
end;

function TLicenseValidator.Validate(const ALicenseKey: string;
  const AHwid: string; const ADeviceName: string; const AOsInfo: string;
  const AProductName: string): TLicenseResult;
var
  Http: TNetHTTPClient;
  Response: IHTTPResponse;
  Payload, ResponseStr: string;
  Json: TJSONObject;
  Stream: TStringStream;
begin
  Result.Valid := False;
  Http := TNetHTTPClient.Create(nil);
  try
    Http.CustomHeaders['x-api-key'] := FApiKey;
    Http.ContentType := 'application/json';

    Payload := '{"license_key":"' + ALicenseKey + '"';
    if AHwid <> '' then Payload := Payload + ',"hwid":"' + AHwid + '"';
    if ADeviceName <> '' then Payload := Payload + ',"device_name":"' + ADeviceName + '"';
    if AOsInfo <> '' then Payload := Payload + ',"os_info":"' + AOsInfo + '"';
    if AProductName <> '' then Payload := Payload + ',"product_name":"' + AProductName + '"';
    Payload := Payload + '}';

    Stream := TStringStream.Create(Payload, TEncoding.UTF8);
    try
      Response := Http.Post(FApiUrl, Stream);
      ResponseStr := Response.ContentAsString;
      Json := TJSONObject.ParseJSONValue(ResponseStr) as TJSONObject;
      try
        Result.Valid := Json.GetValue<Boolean>('valid', False);
        Result.Error := Json.GetValue<string>('error', '');
        Result.ForceShutdown := Json.GetValue<Boolean>('force_shutdown', False);

        if Result.ForceShutdown then
          Halt(1); // ⚠️ إغلاق فوري

      finally
        Json.Free;
      end;
    finally
      Stream.Free;
    end;
  finally
    Http.Free;
  end;
end;

end.

// ── الاستخدام ──
// var Validator := TLicenseValidator.Create('YOUR_API_KEY');
// var Result := Validator.Validate('XXXX-XXXX-XXXX-XXXX', 'DEVICE_HWID');
// if Result.Valid then ShowMessage('ترخيص صالح!');`,

  cpp: `#include <iostream>
#include <string>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

struct LicenseResult {
    bool valid = false;
    std::string error;
    bool force_shutdown = false;
    std::string status;
    std::string expire_at;
    int max_devices = 0;
    std::string customer;
    std::string product;
};

static size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* out) {
    out->append((char*)contents, size * nmemb);
    return size * nmemb;
}

class LicenseValidator {
    std::string api_url = "${apiUrl}";
    std::string api_key;

public:
    LicenseValidator(const std::string& apiKey) : api_key(apiKey) {}

    LicenseResult validate(const std::string& license_key,
                           const std::string& hwid = "",
                           const std::string& device_name = "",
                           const std::string& os_info = "") {
        LicenseResult result;
        CURL* curl = curl_easy_init();
        if (!curl) { result.error = "Failed to init curl"; return result; }

        json payload = {{"license_key", license_key}};
        if (!hwid.empty()) payload["hwid"] = hwid;
        if (!device_name.empty()) payload["device_name"] = device_name;
        if (!os_info.empty()) payload["os_info"] = os_info;

        std::string body = payload.dump();
        std::string response;

        struct curl_slist* headers = nullptr;
        headers = curl_slist_append(headers, ("x-api-key: " + api_key).c_str());
        headers = curl_slist_append(headers, "Content-Type: application/json");

        curl_easy_setopt(curl, CURLOPT_URL, api_url.c_str());
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body.c_str());
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

        CURLcode res = curl_easy_perform(curl);
        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);

        if (res != CURLE_OK) {
            result.error = curl_easy_strerror(res);
            return result;
        }

        try {
            auto j = json::parse(response);
            result.valid = j.value("valid", false);
            result.error = j.value("error", "");
            result.force_shutdown = j.value("force_shutdown", false);

            if (result.force_shutdown) {
                // ⚠️ إغلاق فوري
                exit(1);
            }
        } catch (...) {
            result.error = "JSON parse error";
        }

        return result;
    }
};

// ── الاستخدام ──
// LicenseValidator validator("YOUR_API_KEY");
// auto result = validator.validate("XXXX-XXXX-XXXX-XXXX", "DEVICE_HWID");
// if (result.valid) { std::cout << "ترخيص صالح!" << std::endl; }`,
});

const languages = [
  { key: "csharp", label: "C#", icon: "🔷" },
  { key: "python", label: "Python", icon: "🐍" },
  { key: "javascript", label: "JavaScript", icon: "🟨" },
  { key: "php", label: "PHP", icon: "🐘" },
  { key: "delphi", label: "Delphi", icon: "🔶" },
  { key: "cpp", label: "C++", icon: "⚡" },
];

const statusCodes = [
  { code: 200, meaning: "نجاح — تحقق من valid في الجسم", color: "bg-green-500/10 text-green-500" },
  { code: 400, meaning: "طلب غير صالح — بيانات ناقصة أو format خاطئ", color: "bg-yellow-500/10 text-yellow-500" },
  { code: 401, meaning: "غير مصرح — API Key غير صالح أو منتهي", color: "bg-red-500/10 text-red-500" },
  { code: 403, meaning: "محظور — IP أو HWID محجوب أو مفتاح ملغى", color: "bg-red-500/10 text-red-500" },
  { code: 429, meaning: "كثرة طلبات — تم تجاوز حد الاستخدام", color: "bg-orange-500/10 text-orange-500" },
  { code: 500, meaning: "خطأ داخلي في السيرفر", color: "bg-red-500/10 text-red-500" },
];

export default function ApiIntegration() {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState<"v1" | "v2">("v2");
  const [apiKeyForJson, setApiKeyForJson] = useState("");
  const { toast } = useToast();

  const currentUrl = selectedEndpoint === "v2" ? VALIDATE_V2_URL : VALIDATE_V1_URL;
  const codeExamples = getCodeExamples(currentUrl);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ title: "تم النسخ ✓" });
    setTimeout(() => setCopied(null), 2000);
  };

  const generateJsonConfig = () => {
    const config = {
      _comment: "License API Integration Config — Generated from Admin Dashboard",
      _version: "2.0",
      _generated_at: new Date().toISOString(),
      server: {
        base_url: SUPABASE_URL,
        validate_v2: VALIDATE_V2_URL,
        validate_v1: VALIDATE_V1_URL,
      },
      authentication: {
        header_name: "x-api-key",
        api_key: apiKeyForJson || "YOUR_API_KEY_HERE",
      },
      request: {
        method: "POST",
        content_type: "application/json",
        timeout_seconds: 10,
        body_schema: {
          license_key: { type: "string", required: true, format: "XXXX-XXXX-XXXX-XXXX", description: "مفتاح الترخيص" },
          hwid: { type: "string", required: false, max_length: 255, description: "معرف الجهاز (Hardware ID)" },
          device_name: { type: "string", required: false, max_length: 200, description: "اسم الجهاز" },
          os_info: { type: "string", required: false, max_length: 200, description: "معلومات نظام التشغيل" },
          product_id: { type: "string", required: false, max_length: 100, description: "UUID المنتج المراد التحقق منه (اختياري)" },
          product_name: { type: "string", required: false, max_length: 200, description: "اسم المنتج المراد التحقق منه (بديل لـ product_id)" },
        },
      },
      response: {
        success: {
          valid: true,
          license: {
            key: "XXXX-XXXX-XXXX-XXXX",
            status: "active",
            expire_at: "2026-12-31T00:00:00+00:00",
            max_devices: 5,
            max_products: 3,
            customer: "اسم العميل",
            product: "المنتج الرئيسي",
            allowed_products: [
              { id: "uuid-1", name: "المنتج الأول" },
              { id: "uuid-2", name: "المنتج الثاني" },
            ],
          },
        },
        error_examples: {
          invalid_license: { valid: false, error: "License not found", force_shutdown: true },
          expired: { valid: false, error: "License has expired", license: { status: "expired" } },
          suspended: { valid: false, error: "License is suspended", force_shutdown: true },
          max_devices: { valid: false, error: "Maximum devices reached", license: { max_devices: 5, current_devices: 5 } },
          product_not_allowed: { valid: false, error: "Product not allowed for this license", license: { allowed_products: ["المنتج الأول"] } },
          blocked_ip: { valid: false, error: "Access denied", force_shutdown: true },
          blocked_hwid: { valid: false, error: "Access denied", force_shutdown: true },
        },
      },
      status_codes: {
        "200": "نجاح — تحقق من valid",
        "400": "طلب غير صالح",
        "401": "غير مصرح — API Key غير صالح",
        "403": "محظور — IP/HWID محجوب",
        "429": "كثرة طلبات",
        "500": "خطأ داخلي",
      },
      security: {
        rate_limit: "30 طلب/دقيقة لكل API Key",
        auto_block: "IP يُحجب تلقائياً بعد 30 محاولة فاشلة",
        force_shutdown: "عند force_shutdown=true يجب إغلاق التطبيق فوراً",
        revoked_keys: "المفاتيح الملغاة ترجع 403 مع force_shutdown",
      },
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "license-api-integration.json";
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "تم التحميل ✓", description: "تم تحميل ملف الإعدادات بنجاح" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">دليل تكامل API</h1>
          <p className="text-muted-foreground">كل ما تحتاجه لربط نظام التراخيص بأي تطبيق</p>
        </div>
        <Button onClick={generateJsonConfig} className="gap-2">
          <Download className="h-4 w-4" />
          تحميل ملف الإعدادات JSON
        </Button>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            البداية السريعة
          </CardTitle>
          <CardDescription>3 خطوات فقط لربط نظام التراخيص بتطبيقك</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center">1</Badge>
                <span className="font-semibold">أنشئ API Key</span>
              </div>
              <p className="text-sm text-muted-foreground">من صفحة بيانات الاعتماد، أنشئ مفتاح API جديد واحفظه</p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center">2</Badge>
                <span className="font-semibold">أرسل طلب POST</span>
              </div>
              <p className="text-sm text-muted-foreground">أرسل license_key و hwid في body مع x-api-key في header</p>
            </div>
            <div className="p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center">3</Badge>
                <span className="font-semibold">تحقق من الرد</span>
              </div>
              <p className="text-sm text-muted-foreground">إذا valid=true الترخيص صالح، وإذا force_shutdown=true أغلق فوراً</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="endpoints" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="endpoints" className="gap-1 text-xs sm:text-sm">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Endpoints</span>
          </TabsTrigger>
          <TabsTrigger value="request" className="gap-1 text-xs sm:text-sm">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline">الطلب</span>
          </TabsTrigger>
          <TabsTrigger value="response" className="gap-1 text-xs sm:text-sm">
            <FileJson className="h-4 w-4" />
            <span className="hidden sm:inline">الردود</span>
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-1 text-xs sm:text-sm">
            <Code2 className="h-4 w-4" />
            <span className="hidden sm:inline">أمثلة</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-1 text-xs sm:text-sm">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1 text-xs sm:text-sm">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">الأمان</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Endpoints ── */}
        <TabsContent value="endpoints" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>نقاط الاتصال (Endpoints)</CardTitle>
              <CardDescription>اختر النسخة المناسبة — v2 هي الموصى بها</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedEndpoint === "v2" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => setSelectedEndpoint("v2")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/10 text-green-500">v2 — الموصى به</Badge>
                      <span className="font-mono text-sm font-semibold">POST</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); copyToClipboard(VALIDATE_V2_URL, "v2-url"); }}>
                      {copied === "v2-url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <code className="text-sm text-muted-foreground break-all">{VALIDATE_V2_URL}</code>
                  <p className="text-sm mt-2">نسخة محسنة مع حماية HWID وتحسينات أمان إضافية</p>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${selectedEndpoint === "v1" ? "border-primary bg-primary/5" : ""}`}
                  onClick={() => setSelectedEndpoint("v1")}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v1 — القديم</Badge>
                      <span className="font-mono text-sm font-semibold">POST</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); copyToClipboard(VALIDATE_V1_URL, "v1-url"); }}>
                      {copied === "v1-url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <code className="text-sm text-muted-foreground break-all">{VALIDATE_V1_URL}</code>
                  <p className="text-sm mt-2">النسخة الأولى — يمكن إيقافها من Kill Switch</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Request ── */}
        <TabsContent value="request" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>هيكل الطلب (Request)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Headers المطلوبة</h3>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-1">
                  <div><span className="text-primary">x-api-key</span>: <span className="text-muted-foreground">YOUR_API_KEY</span> <Badge variant="destructive" className="text-[10px]">مطلوب</Badge></div>
                  <div><span className="text-primary">Content-Type</span>: <span className="text-muted-foreground">application/json</span></div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Body (JSON)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-right p-2">الحقل</th>
                        <th className="text-right p-2">النوع</th>
                        <th className="text-right p-2">مطلوب</th>
                        <th className="text-right p-2">الوصف</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 font-mono text-primary">license_key</td>
                        <td className="p-2">string</td>
                        <td className="p-2"><Badge variant="destructive" className="text-[10px]">نعم</Badge></td>
                        <td className="p-2">مفتاح الترخيص بصيغة XXXX-XXXX-XXXX-XXXX</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono text-primary">hwid</td>
                        <td className="p-2">string</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">لا</Badge></td>
                        <td className="p-2">معرف الجهاز — لتفعيل حماية الأجهزة (max 255 حرف)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono text-primary">device_name</td>
                        <td className="p-2">string</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">لا</Badge></td>
                        <td className="p-2">اسم الجهاز (max 200 حرف)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono text-primary">os_info</td>
                        <td className="p-2">string</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">لا</Badge></td>
                        <td className="p-2">نظام التشغيل (max 200 حرف)</td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-2 font-mono text-primary">product_id</td>
                        <td className="p-2">string</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">لا</Badge></td>
                        <td className="p-2">UUID المنتج المراد التحقق منه (للتراخيص متعددة المنتجات)</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono text-primary">product_name</td>
                        <td className="p-2">string</td>
                        <td className="p-2"><Badge variant="outline" className="text-[10px]">لا</Badge></td>
                        <td className="p-2">اسم المنتج (بديل لـ product_id، حساس لحالة الأحرف لا)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">مثال طلب cURL</h3>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{`curl -X POST ${currentUrl} \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "hwid": "DEVICE_HARDWARE_ID",
    "device_name": "My PC",
    "os_info": "Windows 11",
    "product_name": "اسم المنتج"
  }'`}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 left-2"
                    onClick={() => copyToClipboard(`curl -X POST ${currentUrl} -H "x-api-key: YOUR_API_KEY" -H "Content-Type: application/json" -d '{"license_key":"XXXX-XXXX-XXXX-XXXX","hwid":"DEVICE_HWID","product_name":"اسم المنتج"}'`, "curl")}
                  >
                    {copied === "curl" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Response ── */}
        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أكواد الحالة (Status Codes)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statusCodes.map((sc) => (
                  <div key={sc.code} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge className={sc.color}>{sc.code}</Badge>
                    <span className="text-sm">{sc.meaning}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>أمثلة الردود</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2 text-green-500">✅ ترخيص صالح (متعدد المنتجات)</h3>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{JSON.stringify({
                  valid: true,
                  license: {
                    key: "ABCD-1234-EFGH-5678",
                    status: "active",
                    expire_at: "2026-12-31T00:00:00+00:00",
                    max_devices: 5,
                    max_products: 3,
                    customer: "اسم العميل",
                    product: "المنتج الرئيسي",
                    allowed_products: [
                      { id: "uuid-1", name: "المنتج الأول" },
                      { id: "uuid-2", name: "المنتج الثاني" },
                      { id: "uuid-3", name: "المنتج الثالث" }
                    ]
                  }
                }, null, 2)}</pre>
                <p className="text-xs text-muted-foreground mt-2">
                  💡 <code className="bg-muted px-1 rounded">allowed_products</code> = قائمة المنتجات التي يمكن للعميل استخدامها بهذا الترخيص. لو فارغة = جميع المنتجات.
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2 text-red-500">❌ ترخيص غير صالح (مع force_shutdown)</h3>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{JSON.stringify({
                  valid: false,
                  error: "License not found",
                  force_shutdown: true
                }, null, 2)}</pre>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2 text-purple-500">🚫 منتج غير مسموح به</h3>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{JSON.stringify({
                  valid: false,
                  error: "Product not allowed for this license",
                  license: {
                    key: "ABCD-1234-EFGH-5678",
                    allowed_products: ["المنتج الأول", "المنتج الثاني"]
                  }
                }, null, 2)}</pre>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2 text-yellow-500">⚠️ تجاوز حد الأجهزة</h3>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{JSON.stringify({
                  valid: false,
                  error: "Maximum devices reached",
                  license: { key: "ABCD-1234-EFGH-5678", max_devices: 5, current_devices: 5 }
                }, null, 2)}</pre>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2 text-orange-500">⏰ ترخيص منتهي</h3>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{JSON.stringify({
                  valid: false,
                  error: "License has expired",
                  license: { key: "ABCD-1234-EFGH-5678", status: "expired", expire_at: "2025-01-01T00:00:00+00:00" }
                }, null, 2)}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Code Examples ── */}
        <TabsContent value="code" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                أمثلة أكواد جاهزة — Endpoint: {selectedEndpoint.toUpperCase()}
              </CardTitle>
              <CardDescription>انسخ الكود والصق مفتاح API الخاص بك</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="csharp" className="space-y-4">
                <TabsList className="flex flex-wrap gap-1">
                  {languages.map((lang) => (
                    <TabsTrigger key={lang.key} value={lang.key} className="gap-1 text-xs">
                      <span>{lang.icon}</span> {lang.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {languages.map((lang) => (
                  <TabsContent key={lang.key} value={lang.key}>
                    <div className="relative">
                      <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto max-h-[500px]">
                        <code>{codeExamples[lang.key as keyof typeof codeExamples]}</code>
                      </pre>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="absolute top-2 left-2 gap-1"
                        onClick={() => copyToClipboard(codeExamples[lang.key as keyof typeof codeExamples], lang.key)}
                      >
                        {copied === lang.key ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        نسخ
                      </Button>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Webhooks ── */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                إشعارات Webhook — انتهاء التراخيص
              </CardTitle>
              <CardDescription>استقبل إشعارات تلقائية عند اقتراب أو انتهاء صلاحية التراخيص</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* How it works */}
              <div>
                <h3 className="font-semibold mb-3">كيف يعمل؟</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center">1</Badge>
                      <span className="font-semibold">سجّل Webhook URL</span>
                    </div>
                    <p className="text-sm text-muted-foreground">حدد عنوان URL الذي سيستقبل الإشعارات (مثلاً سيرفرك أو Zapier أو n8n)</p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center">2</Badge>
                      <span className="font-semibold">النظام يفحص التراخيص</span>
                    </div>
                    <p className="text-sm text-muted-foreground">يتم فحص التراخيص يومياً وإرسال إشعار قبل الانتهاء بالأيام المحددة</p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center">3</Badge>
                      <span className="font-semibold">استقبل POST request</span>
                    </div>
                    <p className="text-sm text-muted-foreground">يصلك طلب POST مع بيانات الترخيص والعميل وموعد الانتهاء</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Webhook Payload */}
              <div>
                <h3 className="font-semibold mb-2">هيكل الإشعار (Webhook Payload)</h3>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{JSON.stringify({
                    event: "license.expiring_soon",
                    timestamp: "2026-03-09T08:00:00Z",
                    data: {
                      license_id: "uuid-here",
                      license_key: "ABCD-1234-EFGH-5678",
                      status: "active",
                      expire_at: "2026-03-12T00:00:00Z",
                      days_remaining: 3,
                      customer: {
                        id: "uuid-here",
                        name: "اسم العميل",
                        email: "customer@example.com"
                      },
                      product: {
                        id: "uuid-here",
                        name: "اسم المنتج"
                      }
                    }
                  }, null, 2)}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 left-2"
                    onClick={() => copyToClipboard(JSON.stringify({
                      event: "license.expiring_soon",
                      timestamp: "2026-03-09T08:00:00Z",
                      data: {
                        license_id: "uuid-here",
                        license_key: "ABCD-1234-EFGH-5678",
                        status: "active",
                        expire_at: "2026-03-12T00:00:00Z",
                        days_remaining: 3,
                        customer: { id: "uuid-here", name: "اسم العميل", email: "customer@example.com" },
                        product: { id: "uuid-here", name: "اسم المنتج" }
                      }
                    }, null, 2), "webhook-payload")}
                  >
                    {copied === "webhook-payload" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Event Types */}
              <div>
                <h3 className="font-semibold mb-2">أنواع الأحداث (Event Types)</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge className="bg-yellow-500/10 text-yellow-500">license.expiring_soon</Badge>
                    <span className="text-sm">الترخيص سينتهي قريباً (حسب أيام التنبيه المحددة في الإعدادات)</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge className="bg-red-500/10 text-red-500">license.expired</Badge>
                    <span className="text-sm">انتهت صلاحية الترخيص اليوم</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge className="bg-green-500/10 text-green-500">license.renewed</Badge>
                    <span className="text-sm">تم تجديد الترخيص بنجاح</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Badge className="bg-blue-500/10 text-blue-500">license.created</Badge>
                    <span className="text-sm">تم إنشاء ترخيص جديد</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Webhook Headers */}
              <div>
                <h3 className="font-semibold mb-2">Headers المُرسلة مع الإشعار</h3>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-1">
                  <div><span className="text-primary">Content-Type</span>: <span className="text-muted-foreground">application/json</span></div>
                  <div><span className="text-primary">X-Webhook-Event</span>: <span className="text-muted-foreground">license.expiring_soon</span></div>
                  <div><span className="text-primary">X-Webhook-Signature</span>: <span className="text-muted-foreground">sha256=...</span> <Badge variant="outline" className="text-[10px]">للتحقق من المصدر</Badge></div>
                  <div><span className="text-primary">X-Webhook-Timestamp</span>: <span className="text-muted-foreground">1709971200</span></div>
                </div>
              </div>

              <Separator />

              {/* Verification Example */}
              <div>
                <h3 className="font-semibold mb-2">مثال: التحقق من صحة الإشعار (Node.js)</h3>
                <div className="relative">
                  <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// في Express.js
app.post('/webhook/licenses', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhook(
    JSON.stringify(req.body),
    signature,
    'YOUR_WEBHOOK_SECRET'
  );

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body;

  switch (event) {
    case 'license.expiring_soon':
      console.log(\`⚠️ ترخيص \${data.license_key} سينتهي خلال \${data.days_remaining} يوم\`);
      // أرسل تنبيه للعميل
      break;
    case 'license.expired':
      console.log(\`❌ انتهى ترخيص \${data.license_key}\`);
      // إيقاف الخدمة أو إرسال تذكير
      break;
  }

  res.json({ received: true });
});`}</pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 left-2"
                    onClick={() => copyToClipboard(`const crypto = require('crypto');\n\nfunction verifyWebhook(payload, signature, secret) {\n  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');\n  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));\n}`, "webhook-verify")}
                  >
                    {copied === "webhook-verify" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Best Practices */}
              <div>
                <h3 className="font-semibold mb-3">أفضل الممارسات</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" />
                      تحقق من التوقيع دائماً
                    </h4>
                    <p className="text-sm text-muted-foreground">استخدم X-Webhook-Signature للتأكد من أن الإشعار من مصدر موثوق وليس مزوراً</p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      رد بسرعة (200 OK)
                    </h4>
                    <p className="text-sm text-muted-foreground">أرسل رد 200 فوراً ثم عالج البيانات في الخلفية. Timeout بعد 30 ثانية يعتبر فشل</p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      تعامل مع التكرار
                    </h4>
                    <p className="text-sm text-muted-foreground">قد يُعاد إرسال الإشعار عند الفشل. استخدم license_id + event كـ idempotency key</p>
                  </div>
                  <div className="p-4 border rounded-lg space-y-2">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      إعادة المحاولة
                    </h4>
                    <p className="text-sm text-muted-foreground">عند فشل الإرسال، يُعاد المحاولة 3 مرات بفاصل 1، 5، 30 دقيقة</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Security ── */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                نظام الحماية
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Rate Limiting
                  </h3>
                  <p className="text-sm text-muted-foreground">30 طلب في الدقيقة لكل API Key. عند التجاوز يرجع 429.</p>
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-destructive" />
                    Auto-Block
                  </h3>
                  <p className="text-sm text-muted-foreground">بعد 30 محاولة فاشلة يتم حجب IP تلقائياً مع إشعار تيليجرام.</p>
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Force Shutdown
                  </h3>
                  <p className="text-sm text-muted-foreground">عندما يكون force_shutdown=true يجب على تطبيقك إغلاق نفسه فوراً — هذا يعني IP/HWID محجوب أو مفتاح ملغى.</p>
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Server className="h-4 w-4 text-info" />
                    حماية الأجهزة
                  </h3>
                  <p className="text-sm text-muted-foreground">أرسل hwid مع كل طلب لتفعيل حماية الأجهزة. السيرفر يتتبع الأجهزة ويمنع تجاوز الحد الأقصى.</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">خوارزمية التحقق الموصى بها</h3>
                <div className="bg-muted rounded-lg p-4 text-sm space-y-1 font-mono">
                  <p>1. أرسل الطلب مع license_key + hwid</p>
                  <p>2. إذا HTTP status ≠ 200 → أغلق التطبيق</p>
                  <p>3. إذا force_shutdown == true → أغلق فوراً</p>
                  <p>4. إذا valid == false → أظهر رسالة الخطأ</p>
                  <p>5. إذا valid == true → شغّل التطبيق</p>
                  <p>6. كرر التحقق كل فترة (مثلاً كل 30 دقيقة)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Download JSON Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            تحميل ملف الإعدادات
          </CardTitle>
          <CardDescription>حمّل ملف JSON يحتوي على جميع إعدادات السيرفر لاستخدامه في تطبيقك</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">API Key (اختياري — لتضمينه في الملف)</label>
              <input
                type="text"
                value={apiKeyForJson}
                onChange={(e) => setApiKeyForJson(e.target.value)}
                placeholder="lm_xxxx... (اتركه فارغاً لاستخدام placeholder)"
                className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
              />
            </div>
            <Button onClick={generateJsonConfig} className="gap-2 shrink-0">
              <Download className="h-4 w-4" />
              تحميل license-api-integration.json
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
