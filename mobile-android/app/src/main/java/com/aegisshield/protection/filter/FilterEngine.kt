package com.aegisshield.protection.filter

import android.content.Context
import java.util.Locale

class FilterEngine(private val context: Context) {

    private val adultDomains = hashSetOf(
        "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com", "redtube.com",
        "youporn.com", "brazzers.com", "stripchat.com", "chaturbate.com", "cam4.com",
        "livejasmin.com", "bongacams.com", "eporner.com", "beeg.com", "spankbang.com",
        "tube8.com", "hentaihaven.xxx", "hanime.tv", "nhentai.net", "rule34.xxx",
        "javhd.com", "fetlife.com", "txxx.com", "heavy-r.com", "youjizz.com",
        "porn.com", "4tube.com", "fapster.com", "pornmd.com", "porntrex.com",
        "porndoe.com", "tubegalore.com", "nudevista.com", "czechav.com", "bangbros.com",
        "realitykings.com", "naughtyamerica.com", "evilangel.com", "mofos.com",
        "erome.com", "coomer.su", "bunkr.is", "myfreecams.com", "cams.com",
        "slutload.com", "hardsextube.com", "extremetube.com", "desiporn.com",
        "desisex.com", "kamababa.com", "antarvasna.com", "savita.live", "anysex.com"
    )

    private val explicitKeywords = listOf(
        "porn", "porno", "pornography", "xxx", "xvideos", "xnxx", "xhamster",
        "redtube", "youporn", "brazzers", "stripchat", "chaturbate", "onlyfans leak",
        "cam4", "livejasmin", "bongacams", "hentai", "javhd", "eporner", "beeg",
        "spankbang", "tube8", "slut", "nsfw", "adult video", "hardcore sex",
        "fuck video", "pussy", "dick pic", "blowjob", "threesome", "orgasm",
        "shemale", "transgender porn", "milf porn", "nude pics", "naked girls",
        "sex tape", "rule34", "masturbation video", "desisex", "indian porn", "bhabhi sex"
    )

    fun isDomainBlocked(text: String?): Boolean {
        if (text.isNullOrBlank()) return false
        val clean = text.lowercase(Locale.ROOT)

        for (domain in adultDomains) {
            if (clean.contains(domain)) return true
        }
        return false
    }

    fun isContentExplicit(text: String?): Boolean {
        if (text.isNullOrBlank()) return false
        val cleanText = text.lowercase(Locale.ROOT)

        for (kw in explicitKeywords) {
            if (kw.length < 3) continue
            val pattern = Regex("\\b${Regex.escape(kw)}\\b", RegexOption.IGNORE_CASE)
            if (pattern.containsMatchIn(cleanText) || (kw.length >= 4 && cleanText.contains(kw))) {
                return true
            }
        }

        // Domain root check (e.g. "pornhub", "xvideos", "xnxx")
        for (domain in adultDomains) {
            val root = domain.substringBeforeLast(".")
            if (root.length >= 4 && cleanText.contains(root)) {
                return true
            }
        }

        return false
    }
}
