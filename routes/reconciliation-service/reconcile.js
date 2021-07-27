

module.exports = (router) => {
    router.get('/reconciliator', (req, res)=>{
        res.send({
            reconciliators: [
                {
                    label: "ASIA (wikifier)",
                    value: "asia/reconcile/wikifier"
                }, 
                {
                    label: "ASIA (geonames)",
                    value: "asia/reconcile/geonames",
                },
                {
                    label: "Wikidata",
                    value: "wikidata/reconcile",
                },{
                    label: "ASIA (keywords matcher)",
                    value: "asia/reconcile/keywordsmatcher"
                }
            ]
        })
    })
}