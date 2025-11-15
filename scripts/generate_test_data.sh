#!/bin/bash

# Script to generate test audio sessions across 4 weeks
# Shows emotional progression: Week 1 (very bad) → Week 4 (excellent)
# 2-5 sessions per week with realistic emotional journey

set -e

# Configuration
PROJECT_ID="build-unicorn25par-4813"
BUCKET_RAW="pz-audio-raw-${PROJECT_ID}"

# Calculate week numbers for the past 4 weeks
get_week_offset() {
    local offset=$1
    local date_offset=$((offset * 7))
    date -v-${date_offset}d +%Y-W%V 2>/dev/null || date -d "${date_offset} days ago" +%Y-W%V
}

WEEK_1=$(get_week_offset 3)  # 3 weeks ago - Very bad
WEEK_2=$(get_week_offset 2)  # 2 weeks ago - Starting to improve
WEEK_3=$(get_week_offset 1)  # Last week - Much better
WEEK_4=$(get_week_offset 0)  # This week - Excellent

echo "📅 Generating emotional progression test data:"
echo "  - Week 1: $WEEK_1 😞 (Very bad - depression, anxiety)"
echo "  - Week 2: $WEEK_2 😐 (Improving - starting therapy)"
echo "  - Week 3: $WEEK_3 🙂 (Much better - progress visible)"
echo "  - Week 4: $WEEK_4 😊 (Excellent - thriving)"
echo ""

# Week 1: Very bad mental state (depression, anxiety, hopelessness)
declare -a WEEK1_TEXTS=(
    "Je ne sais même plus par où commencer. Tout me semble insurmontable en ce moment. Je me réveille le matin avec cette boule d'angoisse dans le ventre, et je n'arrive pas à la faire partir de toute la journée. Le travail s'accumule sur mon bureau, les emails non lus dépassent la centaine, et je n'arrive plus à me concentrer plus de quelques minutes d'affilée. J'ai l'impression de décevoir tout le monde autour de moi, mes collègues, ma famille, mes amis. Même les tâches les plus simples me paraissent comme des montagnes. Hier, j'ai passé deux heures à fixer mon ordinateur sans rien faire, paralysé par l'anxiété. Je sais que je devrais demander de l'aide mais j'ai tellement honte de ne pas y arriver seul. Les autres ont l'air de tout gérer sans problème, pourquoi pas moi ? Je me sens comme un imposteur dans ma propre vie."
    
    "Encore une nuit blanche. C'est la quatrième cette semaine. Je tourne et retourne dans mon lit en ressassant les mêmes pensées négatives, encore et encore, comme un disque rayé dont je n'arrive pas à me débarrasser. Pourquoi est-ce que je n'arrive pas à avancer comme les autres ? Pourquoi tout me paraît si difficile alors que pour les gens autour de moi ça semble si naturel ? J'ai l'impression d'être constamment à côté de la plaque, de ne jamais être à la hauteur des attentes. Au travail, je fais semblant d'être concentré mais en réalité je ne fais que survivre d'heure en heure. Ce matin, en me regardant dans le miroir, j'ai à peine reconnu la personne qui me fixait. Les cernes sous mes yeux racontent l'histoire de toutes ces nuits d'insomnie. Je me sens vide, comme si toute mon énergie vitale s'était évaporée."
    
    "Aujourd'hui j'ai annulé tous mes rendez-vous. Je n'ai plus la force de faire semblant que tout va bien, de mettre ce masque social qui me demande tant d'énergie. Même sortir de chez moi me paraît être un effort considérable, insurmontable. Je me sens tellement fatigué, pas physiquement, mais mentalement épuisé, vidé de toute substance. C'est comme si mon cerveau avait atteint ses limites et refusait maintenant de fonctionner normalement. J'ai passé la journée sur mon canapé, à regarder le plafond, incapable de trouver la motivation pour quoi que ce soit. Même les séries que j'aimais regarder ne m'intéressent plus. La nourriture n'a plus de goût. Les choses qui me faisaient plaisir avant me laissent maintenant complètement indifférent. Je me demande si je vais retrouver un jour cette étincelle, cette envie de vivre pleinement."
    
    "Les gens autour de moi me disent que ça va passer, que c'est juste une mauvaise période, qu'il faut que je me secoue un peu. Mais ils ne comprennent pas ce que je ressens vraiment au fond de moi. Cette tristesse constante qui m'accompagne du matin au soir, cette anxiété qui ne me lâche jamais, même dans mes rêves. Je me sens seul même quand je suis entouré de monde. C'est comme si j'étais derrière une vitre, séparé du reste du monde, incapable de vraiment me connecter aux autres. Aujourd'hui au bureau, tout le monde riait d'une blague et moi j'étais là, à faire semblant de sourire, mais à l'intérieur je me sentais complètement déconnecté. Je rentre chez moi et je m'effondre, épuisé par l'effort de paraître normal toute la journée. Personne ne voit la bataille que je mène chaque jour juste pour tenir debout."
    
    "J'ai essayé de travailler aujourd'hui sur ce dossier urgent mais c'était impossible de me concentrer plus de cinq minutes. Mon cerveau est en mode survie permanent, à ruminer sans arrêt les mêmes scénarios catastrophes. Et si je perdais mon travail ? Et si tout le monde découvrait que je ne suis pas capable de gérer ? Et si je finissais seul et abandonné de tous ? Ces pensées tournent en boucle, m'empêchant de me concentrer sur quoi que ce soit de constructif. Je suis épuisé de me battre contre moi-même, contre cette petite voix intérieure qui ne cesse de me dire que je ne vaux rien, que je ne suis pas assez bien. J'ai l'impression d'être dans un tunnel noir sans voir la sortie. La thérapie que j'ai commencée ne semble pas encore faire effet, ou peut-être que je suis un cas désespéré. Je ne sais plus quoi faire."
)

# WEEK 2 - Starting to improve: first therapy session, small steps
declare -a WEEK2_TEXTS=(
    "Cette semaine a été un peu moins terrible que la précédente, même si c'est encore très difficile. J'ai réussi à aller à ma séance de thérapie malgré l'envie de tout annuler. Ma psy m'a fait remarquer quelque chose d'intéressant, elle dit que le simple fait que j'aie réussi à venir est déjà une petite victoire en soi. Sur le moment je n'y ai pas trop cru, mais en y repensant ce soir, peut-être qu'elle a raison. Peut-être que je suis trop dur avec moi-même et que je ne reconnais pas mes efforts. J'ai aussi réussi à finir ce rapport que je repoussais depuis des semaines. Ce n'est pas parfait, loin de là, mais au moins c'est fait et envoyé. Mon chef a même dit que c'était du bon travail, ce qui m'a surpris. Je ne m'attendais pas à un retour positif. L'anxiété est toujours là, bien présente, mais j'ai l'impression qu'elle laisse parfois un peu de répit. Hier soir, j'ai même réussi à regarder un épisode de cette série sans que mon esprit parte dans tous les sens."
    
    "J'ai fait quelque chose que je n'avais pas fait depuis longtemps, je suis sorti me promener dans le parc ce matin avant d'aller travailler. L'air frais m'a fait du bien, et pendant quelques minutes j'ai presque oublié cette sensation d'oppression dans la poitrine. C'était juste quelques minutes, mais ça m'a rappelé qu'il existe encore des moments agréables, même s'ils sont rares en ce moment. Au travail, j'ai réussi à avoir une conversation normale avec un collègue sans me sentir complètement à côté de mes pompes. On a parlé du projet en cours et j'ai même eu quelques bonnes idées à proposer. Ça fait longtemps que je ne m'étais pas senti utile professionnellement. Ce soir je me suis préparé un vrai repas au lieu de grignoter n'importe quoi devant l'ordinateur. C'est un petit geste mais ça compte. Ma thérapeute m'a dit qu'il fallait célébrer ces petites victoires quotidiennes. J'essaie de la croire même si une partie de moi trouve ça ridicule."
    
    "Aujourd'hui j'ai appelé un ami que je n'avais pas vu depuis des mois. J'avais tellement honte de mon état que j'évitais tout le monde, mais là j'ai trouvé le courage de décrocher le téléphone. On a parlé pendant une heure et ça m'a fait un bien fou. Il ne m'a pas jugé quand je lui ai expliqué que je traversais une période difficile, au contraire il a été super compréhensif. Il m'a même confié qu'il avait vécu quelque chose de similaire il y a quelques années. Ça m'a fait réaliser que je ne suis pas seul dans cette situation, que plein de gens traversent des moments difficiles sans que ça se voie de l'extérieur. Je me suis senti moins isolé, moins anormal. Le brouillard mental est toujours présent mais aujourd'hui j'ai réussi à être productif plusieurs heures d'affilée, ce qui ne m'était pas arrivé depuis longtemps. Petit à petit, très doucement, j'ai l'impression que quelque chose commence à bouger en moi."
    
    "Les exercices de respiration que ma thérapeute m'a enseignés commencent à faire effet. Quand je sens l'anxiété monter, j'arrive maintenant parfois à la calmer un peu au lieu de me laisser submerger complètement. Ce n'est pas magique, ça ne fonctionne pas à tous les coups, mais quand ça marche c'est un vrai soulagement. Aujourd'hui au bureau, j'ai eu une réunion stressante et au lieu de paniquer complètement comme d'habitude, j'ai réussi à garder mon calme et à présenter mes idées de façon cohérente. Mes collègues ont semblé apprécier ma contribution, et ça m'a donné un petit boost de confiance. Le soir, au lieu de rester affalé sur le canapé à ruminer, j'ai fait un peu de rangement chez moi. Mon appartement était devenu un vrai capharnaüm ces dernières semaines, reflet de l'état de mon esprit. Ranger m'a donné une impression de reprendre un peu le contrôle sur ma vie."
)

# WEEK 3 - Much better: therapy helping, new habits, reconnecting
declare -a WEEK3_TEXTS=(
    "C'est ma troisième semaine de thérapie et je dois dire que je commence à voir de vrais changements. Les exercices de méditation que ma psy m'a appris font vraiment la différence. Chaque matin, je prends quinze minutes pour méditer et je sens que ça m'aide à aborder la journée avec plus de sérénité. L'anxiété est toujours là, mais elle est devenue plus gérable, moins envahissante. Hier au travail, une situation qui m'aurait complètement paniqué il y a quelques semaines ne m'a causé qu'un léger stress, et j'ai réussi à la gérer calmement. Mon chef l'a remarqué et m'a même félicité pour ma gestion de la situation. Ce retour positif m'a fait énormément de bien. Je commence à me sentir à nouveau compétent, capable. Le soir, j'ai cuisiné un vrai bon repas, mis de la musique, et j'ai même dansé un peu dans ma cuisine. Ce petit moment de légèreté m'a rappelé qui j'étais avant que tout devienne sombre."
    
    "Aujourd'hui j'ai eu une belle surprise au travail. Mon projet sur lequel j'ai beaucoup travaillé ces dernières semaines a été très bien accueilli par la direction. Ils ont même décidé de le présenter au conseil d'administration le mois prochain. Je suis vraiment fier de moi, et ce n'est pas quelque chose que je dis souvent. Mes collègues m'ont invité à déjeuner pour célébrer ça, et j'ai accepté sans hésiter. Il y a un mois, j'aurais trouvé une excuse pour éviter ce genre d'interaction sociale, mais là j'avais vraiment envie d'y aller. On a passé un excellent moment, j'ai ri aux blagues, participé aux conversations, et je me suis senti pleinement présent. Plus de cette sensation d'être derrière une vitre. Je me reconnecte petit à petit au monde et aux gens qui m'entourent. C'est un sentiment formidable que je pensais avoir perdu pour toujours."
    
    "Sophie m'a invité au cinéma ce weekend et j'ai dit oui sans réfléchir. Le moi d'il y a quelques semaines aurait immédiatement refusé, trouvé mille excuses, mais aujourd'hui j'ai vraiment envie de sortir, de revoir mes amis, de vivre normalement. On est allé voir cette comédie dont tout le monde parle et j'ai vraiment passé un super moment. Rire comme ça, sans retenue, ça faisait longtemps. Après le film on est allé prendre un verre et on a parlé de plein de choses. J'ai même raconté un peu ce que je traversais, sans trop de détails, juste assez pour qu'elle comprenne. Elle a été adorable, compréhensive, et m'a remercié de lui faire confiance. Ça fait du bien de ne plus porter ce poids tout seul, de partager avec les personnes qui comptent. Je me sens moins isolé, plus connecté."
    
    "Incroyable, j'ai dormi huit heures d'une traite cette nuit. Une vraie nuit complète, réparatrice, sans réveils nocturnes à ruminer. Je me suis réveillé ce matin avec une énergie que je n'avais pas ressentie depuis des mois. J'en ai profité pour aller courir dans le parc avant le travail. C'était dur au début, mes jambes avaient oublié l'effort, mais quelle satisfaction d'avoir fini ce parcours ! L'exercice physique fait vraiment du bien au moral, ma thérapeute avait raison. Le reste de la journée s'est déroulé sur cette belle dynamique. J'étais productif au travail, de bonne humeur, patient avec les gens. Je commence vraiment à me sentir moi-même à nouveau, à retrouver cette personne que j'étais avant, en mieux peut-être car maintenant je sais que je peux traverser les tempêtes."
)

# WEEK 4 - Excellent: thriving, positive outlook, new projects
declare -a WEEK4_TEXTS=(
    "Je n'arrive toujours pas à réaliser tout le chemin que j'ai parcouru en un mois. Si on m'avait dit il y a quatre semaines que je serais là où je suis aujourd'hui, je ne l'aurais jamais cru. Cette semaine, j'ai reçu une promotion au travail. Une vraie reconnaissance de tout le travail que j'ai accompli, même pendant les moments difficiles. Mon chef m'a dit qu'il avait remarqué mon engagement et ma résilience. Ça m'a beaucoup touché. Je me sens confiant, énergique, prêt à relever ce nouveau défi professionnel. Plus d'anxiété paralysante, plus de doutes qui m'empêchent d'avancer. J'ai même proposé de mener un nouveau projet ambitieux pour le trimestre prochain, chose que je n'aurais jamais osé faire avant. Ma thérapeute m'a félicité pour tous ces progrès et on a décidé d'espacer un peu les séances. Je continuerai à la voir mais en maintenance, pour consolider tout ce que j'ai appris et acquis ces dernières semaines."
    
    "Ce soir j'ai organisé un dîner chez moi avec mes amis les plus proches. Il y a un mois, l'idée même de recevoir du monde m'aurait terrifié. Mais là j'étais excité à l'idée de partager un bon moment avec eux. J'ai préparé un repas complet, mis la table avec soin, créé une playlist musicale. Quand ils sont arrivés, je les ai accueillis avec un grand sourire, un vrai sourire qui venait du cœur. On a passé une soirée magnifique à discuter, rire, se remémorer de bons souvenirs et en créer de nouveaux. J'étais pleinement présent, profitant de chaque instant. Sophie m'a même dit qu'elle me trouvait rayonnant, que j'avais retrouvé cette étincelle dans les yeux qu'elle ne m'avait pas vue depuis longtemps. Ses mots m'ont énormément touché. Après leur départ, en faisant la vaisselle, je me suis surpris à sourire tout seul. C'est ça le bonheur finalement, ces moments simples avec les gens qu'on aime."
    
    "Séance de thérapie aujourd'hui et ma psy m'a dit quelque chose qui m'a marqué. Elle m'a dit qu'elle était très fière de moi, pas seulement pour les progrès que j'ai faits, mais surtout pour le courage que j'ai eu de demander de l'aide quand j'en avais besoin. Elle dit que c'est là que tout a commencé, dans cette première démarche d'accepter qu'on ne peut pas tout gérer seul. On a parlé de l'importance de maintenir cet équilibre que j'ai trouvé, de continuer les bonnes habitudes que j'ai développées : la méditation le matin, l'exercice régulier, les moments sociaux, le temps pour moi. J'ai d'ailleurs découvert une nouvelle passion ces derniers jours, la photographie. J'ai ressorti mon vieil appareil photo et je me suis mis à capturer des moments du quotidien. C'est une façon de voir la beauté dans les petites choses, de rester ancré dans le moment présent. Chaque photo est un petit trésor qui me rappelle que la vie est belle."
    
    "Quelle journée extraordinaire ! Ce matin, réveil à six heures sans alarme, complètement reposé et plein d'énergie. Je suis allé faire du vélo le long de la rivière, le soleil se levait, c'était magnifique. Pendant que je pédalais, je pensais à tout ce chemin parcouru. Il y a un mois j'étais au fond du gouffre, incapable de sortir de mon lit, submergé par l'anxiété et la dépression. Aujourd'hui je suis là, sur mon vélo, en pleine forme, profitant de la vie. Après le vélo, j'ai rejoint ma famille pour un brunch. On a passé des heures à discuter, rire, partager. Mes parents ont remarqué le changement en moi, ils m'ont dit qu'ils me retrouvaient enfin. Le soir, je me suis mis à travailler sur mon projet personnel, cette idée d'application que j'avais depuis longtemps mais que je n'avais jamais eu le courage de commencer. Maintenant je me sens capable de tout. Je suis épanoui, en paix avec moi-même, optimiste pour l'avenir. Si je peux donner un conseil à quelqu'un qui traverse ce que j'ai traversé, c'est de ne jamais perdre espoir. Ça peut aller mieux, vraiment mieux."
    
    "Moment de réflexion ce soir avant de dormir. Je repense à ces quatre dernières semaines et c'est presque irréel. La semaine un, j'étais dans un état terrible, incapable de fonctionner normalement. Puis petit à petit, grâce à la thérapie, au soutien de mes proches, à ma persévérance aussi, j'ai remonté la pente. Chaque semaine a apporté son lot de petites victoires, de moments de progrès. Et maintenant me voilà, non seulement sorti de ce trou noir, mais plus fort qu'avant. J'ai appris tellement de choses sur moi, sur l'importance de prendre soin de sa santé mentale, de ne pas avoir honte de demander de l'aide, de célébrer les petites victoires. Je suis fier de moi, vraiment fier. Fier d'avoir eu le courage de me battre, de ne pas abandonner même quand tout semblait perdu. Cette expérience m'a transformé, elle m'a rendu plus empathique, plus conscient, plus vivant. Demain est un nouveau jour et j'ai hâte de voir ce que la vie me réserve. Je me sens prêt à tout affronter."
)

# Function to generate a session with Google TTS
generate_session() {
    local week=$1
    local session_num=$2
    local text=$3
    local week_label=$4
    
    local timestamp=$(date +%s)
    local random_offset=$((RANDOM % 86400))  # Random time within 24h
    local session_timestamp=$((timestamp - random_offset))
    local session_id="session_${session_timestamp}"
    
    echo "  📝 Session $session_num: ${text:0:50}..."
    
    # Use Google Cloud TTS to generate realistic French audio
    # This requires gcloud and TTS API to be enabled
    local temp_audio="/tmp/${session_id}.mp3"
    local final_audio="/tmp/${session_id}.wav"
    
    # Create TTS request
    gcloud text-to-speech synthesize-speech \
        --text="$text" \
        --output="$temp_audio" \
        --language-code="fr-FR" \
        --voice-name="fr-FR-Neural2-A" \
        --audio-encoding="MP3" \
        2>/dev/null || {
            echo "    ⚠️  TTS API failed, using fallback"
            # Fallback: use macOS say command
            if command -v say &> /dev/null; then
                say -v Thomas -o "/tmp/${session_id}.aiff" "$text" 2>/dev/null
                if command -v ffmpeg &> /dev/null; then
                    ffmpeg -i "/tmp/${session_id}.aiff" -ar 16000 -ac 1 "$final_audio" -y &>/dev/null
                    rm -f "/tmp/${session_id}.aiff"
                fi
            fi
        }
    
    # Convert MP3 to WAV if TTS succeeded
    if [ -f "$temp_audio" ]; then
        ffmpeg -i "$temp_audio" -ar 16000 -ac 1 "$final_audio" -y &>/dev/null 2>&1 || {
            echo "    ⚠️  FFmpeg conversion failed"
            rm -f "$temp_audio"
            return 1
        }
        rm -f "$temp_audio"
    fi
    
    # Upload to GCS (this will trigger the pipeline automatically)
    if [ -f "$final_audio" ]; then
        echo "    📤 Uploading to gs://${BUCKET_RAW}/${week}/${session_id}.wav"
        gsutil cp "$final_audio" "gs://${BUCKET_RAW}/${week}/${session_id}.wav" 2>/dev/null
        rm -f "$final_audio"
        echo "    ✅ Session uploaded - auto-trigger will process it"
    else
        echo "    ❌ Failed to generate audio"
        return 1
    fi
    
    # Small delay between uploads to avoid overwhelming the system
    sleep 2
}

# Generate sessions for a specific week
generate_week_sessions() {
    local week=$1
    local week_num=$2
    local array_name=$3
    local num_sessions=$4
    
    echo ""
    echo "📁 Week $week_num: $week (${num_sessions} sessions)"
    
    # Get array elements using eval
    eval "local texts=(\"\${${array_name}[@]}\")"
    local total=${#texts[@]}
    
    # Generate sessions using first N texts from array
    for i in $(seq 0 $((num_sessions - 1))); do
        local idx=$((i % total))
        local text="${texts[$idx]}"
        generate_session "$week" $((i+1)) "$text" "Week $week_num"
    done
}

echo ""
echo "🚀 Starting emotional journey data generation..."
echo "   This will create realistic audio sessions showing recovery progress"
echo ""

# Check if ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  Warning: ffmpeg not found. Please install it:"
    echo "   macOS: brew install ffmpeg"
    echo "   Linux: sudo apt-get install ffmpeg"
    exit 1
fi

# Generate sessions for each week with 2-5 sessions each
# Week 1: 4 sessions (very depressed)
generate_week_sessions "$WEEK_1" "1" WEEK1_TEXTS 4

# Week 2: 3 sessions (starting therapy, small improvements)
generate_week_sessions "$WEEK_2" "2" WEEK2_TEXTS 3

# Week 3: 4 sessions (much better, reconnecting)
generate_week_sessions "$WEEK_3" "3" WEEK3_TEXTS 4

# Week 4: 5 sessions (thriving, excellent state)
generate_week_sessions "$WEEK_4" "4" WEEK4_TEXTS 5

echo ""
echo "✅ Test data generation complete!"
echo ""
echo "📊 Generated sessions:"
echo "   - Week 1 ($WEEK_1): 4 sessions (😞 depression, anxiety)"
echo "   - Week 2 ($WEEK_2): 3 sessions (😐 starting recovery)"
echo "   - Week 3 ($WEEK_3): 4 sessions (🙂 much better)"
echo "   - Week 4 ($WEEK_4): 5 sessions (😊 excellent, thriving)"
echo "   - Total: 16 sessions across 4 weeks"
echo ""
echo "🔄 Auto-trigger is active - pipelines will process each week automatically"
echo "   Wait a few minutes for all pipelines to complete"
echo ""
echo "📱 View results:"
echo "   - Frontend: http://localhost:3000"
echo "   - History: See all sessions with emotion scores"
echo "   - Reports: Weekly summaries showing emotional progression"
echo "   - Mental Weather: Trend analysis across weeks"
echo ""
